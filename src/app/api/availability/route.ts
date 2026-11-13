import { NextRequest, NextResponse } from "next/server";
import { listConfirmedAppointments } from "@/lib/appointments";
import { clinic } from "@/lib/clinic";
import { getDefaultDoctor } from "@/lib/doctors";
import { availableSlotsForDate, datesWithAvailability } from "@/lib/slots";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const excludeAppointmentId =
    request.nextUrl.searchParams.get("excludeAppointmentId");
  const doctor = await getDefaultDoctor();
  const confirmed = (await listConfirmedAppointments(clinic.defaultDoctorId)).filter(
    (a) => !excludeAppointmentId || a.id !== excludeAppointmentId,
  );

  if (!date) {
    return NextResponse.json({
      dates: datesWithAvailability(confirmed, doctor),
      timezone: doctor.timezone,
      doctorId: doctor.id,
      durationMinutes: doctor.slotMinutes,
      horizonDays: doctor.bookingHorizonDays,
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  return NextResponse.json({
    date,
    slots: availableSlotsForDate(date, confirmed, doctor),
    durationMinutes: doctor.slotMinutes,
  });
}
