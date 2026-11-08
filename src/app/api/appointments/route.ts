import { NextRequest, NextResponse } from "next/server";
import {
  createAppointment,
  findByDniAndBirth,
  isSlotTaken,
  listConfirmedAppointments,
  updateAppointment,
} from "@/lib/appointments";
import {
  calendarIntegrationStatus,
  syncAppointmentToDoctorCalendar,
} from "@/lib/google-calendar";
import { availableSlotsForDate } from "@/lib/slots";
import { bookingSchema, lookupSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const dni = request.nextUrl.searchParams.get("dni") ?? "";
  const birthDate = request.nextUrl.searchParams.get("birthDate") ?? "";
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
    appointments: appointments.map((a) => ({
      ...a,
      // manageToken stays so patient can cancel/reschedule after lookup
    })),
    calendar: calendarIntegrationStatus(),
  });
}

export async function POST(request: NextRequest) {
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

  const data = {
    ...parsed.data,
    email: parsed.data.email || undefined,
  };

  const confirmed = await listConfirmedAppointments();
  const open = availableSlotsForDate(data.date, confirmed);
  if (!open.includes(data.startTime)) {
    return NextResponse.json(
      { error: "Ese horario ya no está disponible. Elegí otro." },
      { status: 409 },
    );
  }

  if (await isSlotTaken(data.date, data.startTime)) {
    return NextResponse.json(
      { error: "Ese horario acaba de ocuparse. Elegí otro." },
      { status: 409 },
    );
  }

  let appointment = await createAppointment(data);

  try {
    const sync = await syncAppointmentToDoctorCalendar(appointment);
    appointment =
      (await updateAppointment(appointment.id, {
        googleEventId: sync.eventId,
        calendarMode: sync.mode,
      })) ?? appointment;
  } catch {
    // Keep the booking even if Google Calendar fails; UI shows mock mode.
    appointment =
      (await updateAppointment(appointment.id, {
        calendarMode: "mock",
        googleEventId: `mock-${appointment.id}`,
      })) ?? appointment;
  }

  return NextResponse.json(
    {
      appointment,
      calendar: calendarIntegrationStatus(),
      message:
        appointment.calendarMode === "google"
          ? "Turno reservado y agregado al calendario del profesional."
          : "Turno reservado. El calendario de Google está en modo demo hasta configurar las credenciales.",
    },
    { status: 201 },
  );
}
