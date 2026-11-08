import { NextResponse } from "next/server";
import { findById } from "@/lib/appointments";
import { buildIcs } from "@/lib/patient-calendar";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  const appointment = await findById(id);
  if (!appointment || appointment.status !== "confirmed") {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const ics = buildIcs(appointment);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="turno-${appointment.date}.ics"`,
    },
  });
}
