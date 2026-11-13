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
import { windowsForDate, workDaysFromSchedule } from "@/lib/schedule";
import type { Appointment, Doctor, DoctorWindow } from "@/lib/types";

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

function resolveDayWindows(
  date: string,
  doctor?: Pick<Doctor, "windows" | "schedule">,
): DoctorWindow[] {
  if (doctor?.schedule && doctor.schedule.length > 0) {
    return windowsForDate(doctor.schedule, date);
  }
  return doctor?.windows ?? [...clinic.windows];
}

function resolveWorkDays(
  doctor?: Pick<Doctor, "workDays" | "schedule">,
): number[] {
  if (doctor?.schedule && doctor.schedule.length > 0) {
    return workDaysFromSchedule(doctor.schedule);
  }
  return doctor?.workDays ?? ([...clinic.workDays] as number[]);
}

export function buildDaySlots(
  date: string,
  doctor?: Pick<Doctor, "windows" | "slotMinutes" | "schedule">,
): string[] {
  const windows = resolveDayWindows(date, doctor);
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

/** Fecha estrictamente anterior al día de hoy en TZ del consultorio. */
export function isClinicDatePast(
  date: string,
  doctor?: Pick<Doctor, "timezone">,
  now = new Date(),
): boolean {
  const timezone = doctor?.timezone ?? clinic.timezone;
  const zonedNow = toZonedTime(now, timezone);
  const today = format(zonedNow, "yyyy-MM-dd");
  return date < today;
}

/**
 * Slot reservable: no es día pasado y, si es hoy, queda más de 1h.
 * Misma regla que usa la API de disponibilidad.
 */
export function isSlotBookable(
  date: string,
  startTime: string,
  doctor?: Pick<Doctor, "timezone">,
  now = new Date(),
): boolean {
  const timezone = doctor?.timezone ?? clinic.timezone;
  const zonedNow = toZonedTime(now, timezone);
  const today = format(zonedNow, "yyyy-MM-dd");
  if (date < today) return false;
  if (date > today) return true;
  const slotDate = parseTimeOnDate(date, startTime);
  return slotDate.getTime() > zonedNow.getTime() + 60 * 60_000;
}

export function availableSlotsForDate(
  date: string,
  appointments: Appointment[],
  doctor?: Pick<
    Doctor,
    "windows" | "slotMinutes" | "workDays" | "timezone" | "schedule"
  >,
  now = new Date(),
): string[] {
  const workDays = resolveWorkDays(doctor);
  if (!isWorkDay(date, workDays)) return [];

  const taken = new Set(
    appointments
      .filter((a) => a.date === date && a.status === "confirmed")
      .map((a) => a.startTime),
  );

  return buildDaySlots(date, doctor).filter((slot) => {
    if (taken.has(slot)) return false;
    return isSlotBookable(date, slot, doctor, now);
  });
}

export function bookableDates(
  doctor?: Pick<
    Doctor,
    "workDays" | "timezone" | "bookingHorizonDays" | "schedule"
  >,
  now = new Date(),
): string[] {
  const timezone = doctor?.timezone ?? clinic.timezone;
  const horizon = doctor?.bookingHorizonDays ?? clinic.bookingHorizonDays;
  const workDays = resolveWorkDays(doctor);
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
    | "windows"
    | "slotMinutes"
    | "workDays"
    | "timezone"
    | "bookingHorizonDays"
    | "schedule"
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
