import { NextRequest, NextResponse } from "next/server";
import { findById } from "@/lib/appointments";
import { cancelAppointmentById } from "@/lib/cancel-appointment";
import { publicAppointment } from "@/lib/public-appointment";
import { rescheduleAppointmentById } from "@/lib/reschedule-appointment";
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
    const updated = await cancelAppointmentById(id);
    return NextResponse.json({
      appointment: updated ? publicAppointment(updated) : updated,
      message: "Turno cancelado.",
    });
  }

  if (!parsed.data.date || !parsed.data.startTime) {
    return NextResponse.json(
      { error: "Indicá fecha y hora para reprogramar" },
      { status: 400 },
    );
  }

  const result = await rescheduleAppointmentById(
    id,
    parsed.data.date,
    parsed.data.startTime,
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    appointment: publicAppointment(result.appointment),
    message: "Turno reprogramado.",
  });
}
