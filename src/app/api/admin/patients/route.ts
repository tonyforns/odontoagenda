import { NextRequest, NextResponse } from "next/server";
import { publicPatient } from "@/lib/db";
import { verifyDoctorPin } from "@/lib/doctors";
import { listPatients } from "@/lib/patients";

export async function GET(request: NextRequest) {
  const pin = request.headers.get("x-doctor-pin") ?? "";
  if (!(await verifyDoctorPin(pin))) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const patients = await listPatients();
  return NextResponse.json({
    patients: patients.map(publicPatient),
  });
}
