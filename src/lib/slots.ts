import {
  addDays,
  format,
  getDay,
  isBefore,
  parse,
  startOfDay,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { clinic } from "@/lib/clinic";
import type { Appointment, Doctor } from "@/lib/types";

function parseTimeOnDate(date: string, time: string): Date {
  return parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
}

export function endTimeFor(
  startTime: string,
  slotMinutes: number = clinic.slotMinutes,
): string {
  const base = parse(startTime, "HH:mm", new Date());
  return format(new Date(base.getTime() + slotMinutes * 60_000), "HH:mm");
}

export function buildDaySlots(
  date: string,
  doctor?: Pick<Doctor, "windows" | "slotMinutes">,
): string[] {
  const windows = doctor?.windows ?? clinic.windows;
  const slotMinutes = doctor?.slotMinutes ?? clinic.slotMinutes;
  const slots: string[] = [];
  for (const window of windows) {
    let cursor = parseTimeOnDate(date, window.start);
    const end = parseTimeOnDate(date, window.end);
    while (isBefore(cursor, end)) {
      slots.push(format(cursor, "HH:mm"));
      cursor = new Date(cursor.getTime() + slotMinutes * 60_000);
    }
  }
  return slots;
}

export function isWorkDay(
  date: string,
  workDays: number[] = clinic.workDays as unknown as number[],
): boolean {
  const day = getDay(parse(date, "yyyy-MM-dd", new Date()));
  return workDays.includes(day);
}

export function availableSlotsForDate(
  date: string,
  appointments: Appointment[],
  doctor?: Pick<Doctor, "windows" | "slotMinutes" | "workDays" | "timezone">,
  now = new Date(),
): string[] {
  const workDays = doctor?.workDays ?? (clinic.workDays as unknown as number[]);
  const timezone = doctor?.timezone ?? clinic.timezone;
  if (!isWorkDay(date, workDays)) return [];

  const zonedNow = toZonedTime(now, timezone);
  const today = format(zonedNow, "yyyy-MM-dd");
  if (date < today) return [];

  const taken = new Set(
    appointments
      .filter((a) => a.date === date && a.status === "confirmed")
      .map((a) => a.startTime),
  );

  return buildDaySlots(date, doctor).filter((slot) => {
    if (taken.has(slot)) return false;
    if (date === today) {
      const slotDate = parseTimeOnDate(date, slot);
      return slotDate.getTime() > zonedNow.getTime() + 60 * 60_000;
    }
    return true;
  });
}

export function bookableDates(
  doctor?: Pick<Doctor, "workDays" | "timezone" | "bookingHorizonDays">,
  now = new Date(),
): string[] {
  const timezone = doctor?.timezone ?? clinic.timezone;
  const horizon = doctor?.bookingHorizonDays ?? clinic.bookingHorizonDays;
  const workDays = doctor?.workDays ?? (clinic.workDays as unknown as number[]);
  const zonedNow = toZonedTime(now, timezone);
  const dates: string[] = [];
  for (let i = 0; i < horizon; i++) {
    const d = addDays(startOfDay(zonedNow), i);
    const key = format(d, "yyyy-MM-dd");
    if (isWorkDay(key, workDays)) dates.push(key);
  }
  return dates;
}

/** Work days in the horizon that still have at least one free slot. */
export function datesWithAvailability(
  appointments: Appointment[],
  doctor?: Pick<
    Doctor,
    "windows" | "slotMinutes" | "workDays" | "timezone" | "bookingHorizonDays"
  >,
  now = new Date(),
): string[] {
  return bookableDates(doctor, now).filter(
    (date) => availableSlotsForDate(date, appointments, doctor, now).length > 0,
  );
}

export function appointmentDateTimeISO(date: string, time: string): string {
  return `${date}T${time}:00-03:00`;
}
