import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { findByPatientId } from "@/lib/appointments";
import { publicPatient } from "@/lib/db";
import { getPatientById, updatePatientById } from "@/lib/patients";
import { publicAppointment } from "@/lib/public-appointment";
import { requireStaffSession } from "@/lib/staff";
import { patientProfileSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const gate = await requireStaffSession(await auth());
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await context.params;
  const patient = await getPatientById(id);
  if (!patient) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const appointments = await findByPatientId(id);
  return NextResponse.json({
    patient: publicPatient(patient),
    appointments: appointments.map(publicAppointment),
  });
}

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

  if (
    body &&
    typeof body === "object" &&
    "email" in body &&
    (body as { email?: unknown }).email !== undefined
  ) {
    return NextResponse.json(
      { error: "El email no se puede modificar." },
      { status: 400 },
    );
  }

  const parsed = patientProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const patient = await updatePatientById(id, parsed.data);
    if (!patient) {
      return NextResponse.json(
        { error: "Paciente no encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json({ patient: publicPatient(patient) });
  } catch (error) {
    if (error instanceof Error && error.message === "DNI_TAKEN") {
      return NextResponse.json(
        { error: "Ese DNI ya está registrado en otro paciente." },
        { status: 409 },
      );
    }
    throw error;
  }
}
