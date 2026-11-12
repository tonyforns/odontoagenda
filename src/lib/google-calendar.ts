import { google } from "googleapis";
import { clinic } from "@/lib/clinic";
import { getPatientById } from "@/lib/patients";
import { patientDisplayName } from "@/lib/patient-utils";
import { appointmentDateTimeISO } from "@/lib/slots";
import type { Appointment, Patient } from "@/lib/types";

export type CalendarSyncResult = {
  mode: "google" | "mock";
  eventId: string;
  htmlLink?: string;
};

function oauthClientId() {
  return process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
}

function oauthClientSecret() {
  return process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
}

function doctorCredentialsConfigured(): boolean {
  return Boolean(
    oauthClientId() &&
      oauthClientSecret() &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

function getDoctorOAuthClient() {
  const client = new google.auth.OAuth2(oauthClientId(), oauthClientSecret());
  client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return client;
}

function getPatientOAuthClient(refreshToken: string) {
  const client = new google.auth.OAuth2(oauthClientId(), oauthClientSecret());
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function doctorEventBody(appointment: Appointment) {
  const patient = appointment.patient;
  const name = patient ? patientDisplayName(patient) : "Paciente";
  return {
    summary: `Turno: ${name}`,
    description: [
      `Paciente: ${name}`,
      patient?.dni ? `DNI: ${patient.dni}` : null,
      patient?.phone ? `Tel: ${patient.phone}` : null,
      patient?.email ? `Email: ${patient.email}` : null,
      patient?.obraSocial ? `Obra social: ${patient.obraSocial}` : null,
      `Duración: ${appointment.durationMinutes} min`,
      `ID interno: ${appointment.id}`,
    ]
      .filter(Boolean)
      .join("\n"),
    location: clinic.address,
    start: {
      dateTime: appointmentDateTimeISO(appointment.date, appointment.startTime),
      timeZone: clinic.timezone,
    },
    end: {
      dateTime: appointmentDateTimeISO(appointment.date, appointment.endTime),
      timeZone: clinic.timezone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "email", minutes: 24 * 60 },
      ],
    },
  };
}

function patientEventBody(appointment: Appointment) {
  const doctorName = appointment.doctor?.fullName ?? clinic.doctorName;
  return {
    summary: `Turno odontológico · ${doctorName}`,
    description: [
      `Profesional: ${doctorName}`,
      `Consultorio: ${clinic.name}`,
      `Dirección: ${clinic.address}`,
      `Tel: ${clinic.phone}`,
      `Duración: ${appointment.durationMinutes} min`,
    ].join("\n"),
    location: clinic.address,
    start: {
      dateTime: appointmentDateTimeISO(appointment.date, appointment.startTime),
      timeZone: clinic.timezone,
    },
    end: {
      dateTime: appointmentDateTimeISO(appointment.date, appointment.endTime),
      timeZone: clinic.timezone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "email", minutes: 24 * 60 },
      ],
    },
  };
}

export async function syncAppointmentToDoctorCalendar(
  appointment: Appointment,
): Promise<CalendarSyncResult> {
  if (!doctorCredentialsConfigured()) {
    return {
      mode: "mock",
      eventId: `mock-${appointment.id}`,
    };
  }

  const auth = getDoctorOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  if (
    appointment.googleEventId &&
    !appointment.googleEventId.startsWith("mock-")
  ) {
    const updated = await calendar.events.patch({
      calendarId,
      eventId: appointment.googleEventId,
      requestBody: doctorEventBody(appointment),
    });
    return {
      mode: "google",
      eventId: updated.data.id || appointment.googleEventId,
      htmlLink: updated.data.htmlLink || undefined,
    };
  }

  const created = await calendar.events.insert({
    calendarId,
    requestBody: doctorEventBody(appointment),
  });

  return {
    mode: "google",
    eventId: created.data.id || `google-${appointment.id}`,
    htmlLink: created.data.htmlLink || undefined,
  };
}

export async function syncAppointmentToPatientCalendar(
  appointment: Appointment,
  patient?: Patient | null,
): Promise<CalendarSyncResult | null> {
  const resolved =
    patient ??
    appointment.patient ??
    (await getPatientById(appointment.patientId));
  const refreshToken = resolved?.googleRefreshToken;
  if (!refreshToken || !oauthClientId() || !oauthClientSecret()) {
    return null;
  }

  const auth = getPatientOAuthClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });
  const body = patientEventBody({
    ...appointment,
    patient: resolved ?? appointment.patient,
  });

  if (
    appointment.patientGoogleEventId &&
    !appointment.patientGoogleEventId.startsWith("mock-")
  ) {
    const updated = await calendar.events.patch({
      calendarId: "primary",
      eventId: appointment.patientGoogleEventId,
      requestBody: body,
    });
    return {
      mode: "google",
      eventId: updated.data.id || appointment.patientGoogleEventId,
      htmlLink: updated.data.htmlLink || undefined,
    };
  }

  const created = await calendar.events.insert({
    calendarId: "primary",
    requestBody: body,
  });

  return {
    mode: "google",
    eventId: created.data.id || `patient-${appointment.id}`,
    htmlLink: created.data.htmlLink || undefined,
  };
}

export async function removeAppointmentFromDoctorCalendar(
  googleEventId?: string | null,
): Promise<void> {
  if (!googleEventId || googleEventId.startsWith("mock-")) return;
  if (!doctorCredentialsConfigured()) return;

  const auth = getDoctorOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  try {
    await calendar.events.delete({ calendarId, eventId: googleEventId });
  } catch {
    // Event may already be deleted
  }
}

export async function removeAppointmentFromPatientCalendar(
  appointment: Appointment,
  patient?: Patient | null,
): Promise<void> {
  const eventId = appointment.patientGoogleEventId;
  if (!eventId || eventId.startsWith("mock-")) return;

  const resolved =
    patient ??
    appointment.patient ??
    (await getPatientById(appointment.patientId));
  const refreshToken = resolved?.googleRefreshToken;
  if (!refreshToken || !oauthClientId() || !oauthClientSecret()) return;

  const auth = getPatientOAuthClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });
  try {
    await calendar.events.delete({ calendarId: "primary", eventId });
  } catch {
    // Event may already be deleted
  }
}

export function calendarIntegrationStatus(): {
  configured: boolean;
  mode: "google" | "mock";
} {
  const configured = doctorCredentialsConfigured();
  return { configured, mode: configured ? "google" : "mock" };
}
