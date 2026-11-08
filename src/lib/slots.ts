import {
  addDays,
  format,
  getDay,
  isBefore,
  parse,
  startOfDay,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { clinic, type Appointment } from "@/lib/clinic";

function parseTimeOnDate(date: string, time: string): Date {
  return parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
}

export function buildDaySlots(date: string): string[] {
  const slots: string[] = [];
  for (const window of clinic.windows) {
    let cursor = parseTimeOnDate(date, window.start);
    const end = parseTimeOnDate(date, window.end);
    while (isBefore(cursor, end)) {
      slots.push(format(cursor, "HH:mm"));
      cursor = new Date(cursor.getTime() + clinic.slotMinutes * 60_000);
    }
  }
  return slots;
}

export function isWorkDay(date: string): boolean {
  const day = getDay(parse(date, "yyyy-MM-dd", new Date()));
  return clinic.workDays.includes(day);
}

export function endTimeFor(startTime: string): string {
  const base = parse(startTime, "HH:mm", new Date());
  return format(
    new Date(base.getTime() + clinic.slotMinutes * 60_000),
    "HH:mm",
  );
}

export function availableSlotsForDate(
  date: string,
  appointments: Appointment[],
  now = new Date(),
): string[] {
  if (!isWorkDay(date)) return [];

  const zonedNow = toZonedTime(now, clinic.timezone);
  const today = format(zonedNow, "yyyy-MM-dd");
  if (date < today) return [];

  const taken = new Set(
    appointments
      .filter((a) => a.date === date && a.status === "confirmed")
      .map((a) => a.startTime),
  );

  return buildDaySlots(date).filter((slot) => {
    if (taken.has(slot)) return false;
    if (date === today) {
      const slotDate = parseTimeOnDate(date, slot);
      return slotDate.getTime() > zonedNow.getTime() + 60 * 60_000;
    }
    return true;
  });
}

export function bookableDates(now = new Date()): string[] {
  const zonedNow = toZonedTime(now, clinic.timezone);
  const dates: string[] = [];
  for (let i = 0; i < clinic.bookingHorizonDays; i++) {
    const d = addDays(startOfDay(zonedNow), i);
    const key = format(d, "yyyy-MM-dd");
    if (isWorkDay(key)) dates.push(key);
  }
  return dates;
}

export function appointmentDateTimeISO(date: string, time: string): string {
  // Represent as local Argentina offset (-03:00 year-round, no DST)
  return `${date}T${time}:00-03:00`;
}
