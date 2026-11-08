import { NextRequest, NextResponse } from "next/server";
import { listAppointments } from "@/lib/appointments";
import { calendarIntegrationStatus } from "@/lib/google-calendar";

const DEMO_PIN = "aurora";

function authorized(request: NextRequest): boolean {
  const pin = request.headers.get("x-doctor-pin") ?? "";
  const expected = process.env.DOCTOR_PIN || DEMO_PIN;
  return pin === expected;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const appointments = await listAppointments();
  return NextResponse.json({
    appointments,
    calendar: calendarIntegrationStatus(),
    demoPinHint: process.env.DOCTOR_PIN ? null : DEMO_PIN,
  });
}
