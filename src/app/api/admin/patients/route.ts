import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publicPatient } from "@/lib/db";
import { createManualPatient, listPatients } from "@/lib/patients";
import { requireStaffSession } from "@/lib/staff";
import { adminPatientCreateSchema } from "@/lib/validators";

export async function GET() {
  const gate = await requireStaffSession(await auth());
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const patients = await listPatients();
  return NextResponse.json({
    patients: patients.map(publicPatient),
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

  const parsed = adminPatientCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { email, ...profile } = parsed.data;
  const patient = await createManualPatient({
    profile,
    email: email || undefined,
  });

  return NextResponse.json(
    { patient: publicPatient(patient) },
    { status: 201 },
  );
}
