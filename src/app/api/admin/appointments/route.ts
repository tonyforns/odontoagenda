import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createAppointment,
  isSlotTaken,
  listAppointments,
  listConfirmedAppointments,
  updateAppointment,
} from "@/lib/appointments";
import { clinic } from "@/lib/clinic";
import { publicPatient } from "@/lib/db";
import { getDefaultDoctor } from "@/lib/doctors";
import {
  calendarIntegrationStatus,
  syncAppointmentToDoctorCalendar,
} from "@/lib/google-calendar";
import {
  createManualPatient,
  getPatientById,
} from "@/lib/patients";
import { publicAppointment } from "@/lib/public-appointment";
import { availableSlotsForDate } from "@/lib/slots";
import { requireStaffSession } from "@/lib/staff";
import { adminAssignSchema } from "@/lib/validators";

export async function GET() {
  const gate = await requireStaffSession(await auth());
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const appointments = await listAppointments();
  return NextResponse.json({
    appointments,
    calendar: calendarIntegrationStatus(),
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireStaffSession(await auth());
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = adminAssignSchema.safeParse(body);
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
      { error: "Ese horario ya no está disponible." },
      { status: 409 },
    );
  }
  if (await isSlotTaken(parsed.data.date, parsed.data.startTime, doctorId)) {
    return NextResponse.json(
      { error: "Ese horario acaba de ocuparse." },
      { status: 409 },
    );
  }

  let patient =
    parsed.data.patientId
      ? await getPatientById(parsed.data.patientId)
      : undefined;

  if (parsed.data.patient) {
    const { email, ...profile } = parsed.data.patient;
    patient = await createManualPatient({
      profile,
      email: email || undefined,
    });
  }

  if (!patient) {
    return NextResponse.json(
      { error: "Paciente no encontrado." },
      { status: 404 },
    );
  }

  let appointment = await createAppointment({
    doctorId,
    patientId: patient.id,
    date: parsed.data.date,
    startTime: parsed.data.startTime,
    durationMinutes: doctor.slotMinutes,
  });

  appointment = {
    ...appointment,
    patient,
    doctor: {
      id: doctor.id,
      fullName: doctor.fullName,
      specialty: doctor.specialty,
    },
  };

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

  return NextResponse.json(
    {
      appointment: publicAppointment({ ...appointment, patient }),
      patient: publicPatient(patient),
      calendar: calendarIntegrationStatus(),
      message: "Turno asignado.",
    },
    { status: 201 },
  );
}
