import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createAppointment,
  findByDniAndBirth,
  findByPatientId,
  isSlotTaken,
  listConfirmedAppointments,
  updateAppointment,
} from "@/lib/appointments";
import { clinic } from "@/lib/clinic";
import { getDefaultDoctor } from "@/lib/doctors";
import {
  calendarIntegrationStatus,
  syncAppointmentToDoctorCalendar,
  syncAppointmentToPatientCalendar,
} from "@/lib/google-calendar";
import { isMockBookingMode } from "@/lib/mock-mode";
import { upsertFromGoogleSession } from "@/lib/patients";
import { isProfileComplete } from "@/lib/patient-utils";
import { publicAppointment } from "@/lib/public-appointment";
import { availableSlotsForDate } from "@/lib/slots";
import { bookingSchema, lookupSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const session = await auth();
  const googleSub = session?.user?.googleSub;

  if (googleSub && session.user?.email) {
    const patient = await upsertFromGoogleSession({
      googleSub,
      email: session.user.email,
      name: session.user.name,
    });
    const appointments = await findByPatientId(patient.id);
    return NextResponse.json({
      appointments: appointments.map(publicAppointment),
      calendar: calendarIntegrationStatus(),
      source: "session",
    });
  }

  const dni = request.nextUrl.searchParams.get("dni") ?? "";
  const birthDate = request.nextUrl.searchParams.get("birthDate") ?? "";
  if (dni || birthDate) {
    const parsed = lookupSchema.safeParse({ dni, birthDate });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }
    const appointments = await findByDniAndBirth(
      parsed.data.dni,
      parsed.data.birthDate,
    );
    return NextResponse.json({
      appointments: appointments.map(publicAppointment),
      calendar: calendarIntegrationStatus(),
      source: "dni",
    });
  }

  return NextResponse.json(
    { error: "Iniciá sesión con Gmail para ver tus turnos." },
    { status: 401 },
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const googleSub = session?.user?.googleSub;
  const sessionEmail = session?.user?.email?.trim().toLowerCase();
  if (!googleSub || !sessionEmail) {
    return NextResponse.json(
      { error: "Tenés que iniciar sesión con Gmail para reservar." },
      { status: 401 },
    );
  }

  const patient = await upsertFromGoogleSession({
    googleSub,
    email: sessionEmail,
    name: session.user?.name,
  });

  if (!isProfileComplete(patient)) {
    return NextResponse.json(
      { error: "Completá tu ficha de paciente antes de reservar." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const doctor = await getDefaultDoctor();
  const doctorId = parsed.data.doctorId || clinic.defaultDoctorId;
  const confirmed = await listConfirmedAppointments(doctorId);
  const open = availableSlotsForDate(parsed.data.date, confirmed, doctor);
  if (!open.includes(parsed.data.startTime)) {
    return NextResponse.json(
      { error: "Ese horario ya no está disponible. Elegí otro." },
      { status: 409 },
    );
  }

  if (await isSlotTaken(parsed.data.date, parsed.data.startTime, doctorId)) {
    return NextResponse.json(
      { error: "Ese horario acaba de ocuparse. Elegí otro." },
      { status: 409 },
    );
  }

  let appointment = await createAppointment({
    doctorId,
    patientId: patient.id,
    date: parsed.data.date,
    startTime: parsed.data.startTime,
    durationMinutes: doctor.slotMinutes,
  });

  // Ensure joined doctor info for patient calendar title
  appointment = {
    ...appointment,
    patient,
    doctor: {
      id: doctor.id,
      fullName: doctor.fullName,
      specialty: doctor.specialty,
    },
  };

  const mockBooking = isMockBookingMode();

  if (mockBooking) {
    appointment =
      (await updateAppointment(appointment.id, {
        calendarMode: "mock",
        googleEventId: `mock-${appointment.id}`,
      })) ?? appointment;

    return NextResponse.json(
      {
        appointment: publicAppointment({ ...appointment, patient }),
        calendar: calendarIntegrationStatus(),
        patientCalendarSynced: false,
        mockBooking: true,
        message:
          "Turno reservado (modo demo). El login es real; Calendar queda mockeado.",
      },
      { status: 201 },
    );
  }

  try {
    const sync = await syncAppointmentToDoctorCalendar(appointment);
    appointment =
      (await updateAppointment(appointment.id, {
        googleEventId: sync.eventId,
        calendarMode: sync.mode,
      })) ?? appointment;
  } catch {
    appointment =
      (await updateAppointment(appointment.id, {
        calendarMode: "mock",
        googleEventId: `mock-${appointment.id}`,
      })) ?? appointment;
  }

  let patientCalendarSynced = false;
  try {
    const patientSync = await syncAppointmentToPatientCalendar(
      { ...appointment, patient, doctor: appointment.doctor },
      patient,
    );
    if (patientSync) {
      appointment =
        (await updateAppointment(appointment.id, {
          patientGoogleEventId: patientSync.eventId,
        })) ?? appointment;
      patientCalendarSynced = true;
    }
  } catch {
    // Booking stays valid even if patient calendar sync fails
  }

  return NextResponse.json(
    {
      appointment: publicAppointment({ ...appointment, patient }),
      calendar: calendarIntegrationStatus(),
      patientCalendarSynced,
      mockBooking: false,
      message: patientCalendarSynced
        ? "Turno reservado y agregado a tu Google Calendar."
        : appointment.calendarMode === "google"
          ? "Turno reservado. No se pudo agregar automáticamente a tu Calendar (volvé a iniciar sesión con Gmail para otorgar permiso)."
          : "Turno reservado.",
    },
    { status: 201 },
  );
}
