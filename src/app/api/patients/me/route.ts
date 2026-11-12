import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publicPatient } from "@/lib/db";
import { updateProfile, upsertFromGoogleSession } from "@/lib/patients";
import { isProfileComplete } from "@/lib/patient-utils";
import { patientProfileSchema } from "@/lib/validators";

async function loadSessionPatient() {
  const session = await auth();
  const googleSub = session?.user?.googleSub;
  const email = session?.user?.email?.trim().toLowerCase();
  if (!googleSub || !email) return null;
  const patient = await upsertFromGoogleSession({
    googleSub,
    email,
    name: session.user?.name,
  });
  return patient;
}

export async function GET() {
  const patient = await loadSessionPatient();
  if (!patient) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return NextResponse.json({
    patient: publicPatient(patient),
    complete: isProfileComplete(patient),
    hasCalendarAccess: Boolean(patient.googleRefreshToken),
  });
}

export async function PUT(request: NextRequest) {
  const patient = await loadSessionPatient();
  if (!patient) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patientProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const updated = await updateProfile(patient.googleSub, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }

  return NextResponse.json({
    patient: publicPatient(updated),
    complete: isProfileComplete(updated),
    hasCalendarAccess: Boolean(updated.googleRefreshToken),
  });
}
