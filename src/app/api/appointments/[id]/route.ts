import { NextRequest, NextResponse } from "next/server";
import {
  findById,
  isSlotTaken,
  listConfirmedAppointments,
  updateAppointment,
} from "@/lib/appointments";
import {
  removeAppointmentFromDoctorCalendar,
  syncAppointmentToDoctorCalendar,
} from "@/lib/google-calendar";
import { availableSlotsForDate, endTimeFor } from "@/lib/slots";
import { manageSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  const appointment = await findById(id);
  if (!appointment) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = manageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  if (parsed.data.manageToken !== appointment.manageToken) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (parsed.data.action === "cancel") {
    if (appointment.status === "cancelled") {
      return NextResponse.json({ appointment });
    }
    await removeAppointmentFromDoctorCalendar(appointment.googleEventId);
    const updated = await updateAppointment(id, { status: "cancelled" });
    return NextResponse.json({
      appointment: updated,
      message: "Turno cancelado.",
    });
  }

  if (!parsed.data.date || !parsed.data.startTime) {
    return NextResponse.json(
      { error: "Indicá fecha y hora para reprogramar" },
      { status: 400 },
    );
  }

  const confirmed = await listConfirmedAppointments();
  const available = availableSlotsForDate(
    parsed.data.date,
    confirmed.filter((a) => a.id !== appointment.id),
  );

  if (!available.includes(parsed.data.startTime)) {
    return NextResponse.json(
      { error: "Ese horario no está disponible" },
      { status: 409 },
    );
  }

  if (await isSlotTaken(parsed.data.date, parsed.data.startTime, id)) {
    return NextResponse.json(
      { error: "Ese horario acaba de ocuparse" },
      { status: 409 },
    );
  }

  let updated = await updateAppointment(id, {
    date: parsed.data.date,
    startTime: parsed.data.startTime,
    endTime: endTimeFor(parsed.data.startTime),
    status: "confirmed",
  });

  if (!updated) {
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  }

  try {
    const sync = await syncAppointmentToDoctorCalendar(updated);
    updated =
      (await updateAppointment(id, {
        googleEventId: sync.eventId,
        calendarMode: sync.mode,
      })) ?? updated;
  } catch {
    // Keep the reschedule even if Google Calendar fails.
  }

  return NextResponse.json({
    appointment: updated,
    message: "Turno reprogramado.",
  });
}
