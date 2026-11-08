import { NextRequest, NextResponse } from "next/server";
import { listConfirmedAppointments } from "@/lib/appointments";
import { availableSlotsForDate, bookableDates } from "@/lib/slots";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const confirmed = await listConfirmedAppointments();

  if (!date) {
    return NextResponse.json({
      dates: bookableDates(),
      timezone: "America/Argentina/Buenos_Aires",
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  return NextResponse.json({
    date,
    slots: availableSlotsForDate(date, confirmed),
  });
}
