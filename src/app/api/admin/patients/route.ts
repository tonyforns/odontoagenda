import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { publicPatient } from "@/lib/db";
import { listPatients } from "@/lib/patients";
import { requireStaffSession } from "@/lib/staff";

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
