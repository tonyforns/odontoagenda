import { NextRequest, NextResponse } from "next/server";
import { listAppointments } from "@/lib/appointments";
import { verifyDoctorPin } from "@/lib/doctors";
import { calendarIntegrationStatus } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const pin = request.headers.get("x-doctor-pin") ?? "";
  if (!(await verifyDoctorPin(pin))) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const appointments = await listAppointments();
  return NextResponse.json({
    appointments,
    calendar: calendarIntegrationStatus(),
    demoPinHint: process.env.DOCTOR_PIN ? null : "1752",
  });
}
