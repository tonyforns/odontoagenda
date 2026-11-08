import { google } from "googleapis";
import { clinic, type Appointment } from "@/lib/clinic";
import { appointmentDateTimeISO } from "@/lib/slots";

export type CalendarSyncResult = {
  mode: "google" | "mock";
  eventId: string;
  htmlLink?: string;
};

function credentialsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

function getOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return client;
}

function eventBody(appointment: Appointment) {
  return {
    summary: `Turno: ${appointment.patientName}`,
    description: [
      `Paciente: ${appointment.patientName}`,
      `DNI: ${appointment.dni}`,
      `Tel: ${appointment.phone}`,
      appointment.email ? `Email: ${appointment.email}` : null,
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

export async function syncAppointmentToDoctorCalendar(
  appointment: Appointment,
): Promise<CalendarSyncResult> {
  if (!credentialsConfigured()) {
    return {
      mode: "mock",
      eventId: `mock-${appointment.id}`,
    };
  }

  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  if (appointment.googleEventId && !appointment.googleEventId.startsWith("mock-")) {
    const updated = await calendar.events.patch({
      calendarId,
      eventId: appointment.googleEventId,
      requestBody: eventBody(appointment),
    });
    return {
      mode: "google",
      eventId: updated.data.id || appointment.googleEventId,
      htmlLink: updated.data.htmlLink || undefined,
    };
  }

  const created = await calendar.events.insert({
    calendarId,
    requestBody: eventBody(appointment),
  });

  return {
    mode: "google",
    eventId: created.data.id || `google-${appointment.id}`,
    htmlLink: created.data.htmlLink || undefined,
  };
}

export async function removeAppointmentFromDoctorCalendar(
  googleEventId?: string | null,
): Promise<void> {
  if (!googleEventId || googleEventId.startsWith("mock-")) return;
  if (!credentialsConfigured()) return;

  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  try {
    await calendar.events.delete({ calendarId, eventId: googleEventId });
  } catch {
    // Event may already be deleted in Google Calendar
  }
}

export function calendarIntegrationStatus(): {
  configured: boolean;
  mode: "google" | "mock";
} {
  const configured = credentialsConfigured();
  return { configured, mode: configured ? "google" : "mock" };
}
