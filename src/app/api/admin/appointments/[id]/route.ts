import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelAppointmentById } from "@/lib/cancel-appointment";
import { publicAppointment } from "@/lib/public-appointment";
import { requireStaffSession } from "@/lib/staff";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const adminAppointmentPatchSchema = z.object({
  action: z.literal("cancel"),
});

export async function PATCH(request: NextRequest, context: Ctx) {
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

  const parsed = adminAppointmentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const updated = await cancelAppointmentById(id);
  if (!updated) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    appointment: publicAppointment(updated),
    message: "Turno cancelado.",
  });
}
