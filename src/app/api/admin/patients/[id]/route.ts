import { NextRequest, NextResponse } from "next/server";
import { findByPatientId } from "@/lib/appointments";
import { publicPatient } from "@/lib/db";
import { verifyDoctorPin } from "@/lib/doctors";
import { getPatientById } from "@/lib/patients";
import { publicAppointment } from "@/lib/public-appointment";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const pin = request.headers.get("x-doctor-pin") ?? "";
  if (!(await verifyDoctorPin(pin))) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
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
