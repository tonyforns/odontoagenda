import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  format,
  isToday,
  isTomorrow,
  parse,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { clinic } from "@/lib/clinic";
import { buildDaySlots, endTimeFor, isSlotBookable } from "@/lib/slots";
import type { Appointment, Doctor } from "@/lib/types";

export type DayAgenda = {
  date: string;
  appointments: Appointment[];
};

export type DaySlot =
  | {
      startTime: string;
      endTime: string;
      status: "available";
      appointment?: undefined;
    }
  | {
      startTime: string;
      endTime: string;
      status: "past";
      appointment?: undefined;
    }
  | {
      startTime: string;
      endTime: string;
      status: "taken";
      appointment: Appointment;
    };

export type DayPeriod = "morning" | "afternoon";

export type DayPeriodAgenda = {
  period: DayPeriod;
  label: string;
  appointments: Appointment[];
};

export type DayPeriodSchedule = {
  period: DayPeriod;
  label: string;
  slots: DaySlot[];
};

const WEEK_STARTS_ON = 1 as const; // Monday

export function confirmedAppointmentsSorted(
  appointments: Appointment[],
): Appointment[] {
  return appointments
    .filter((a) => a.status === "confirmed")
    .sort((a, b) =>
      `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
    );
}

/** Groups confirmed appointments by date, days ascending, slots ascending. */
export function groupAppointmentsByDay(
  appointments: Appointment[],
): DayAgenda[] {
  const sorted = confirmedAppointmentsSorted(appointments);
  const map = new Map<string, Appointment[]>();
  for (const appointment of sorted) {
    const list = map.get(appointment.date) ?? [];
    list.push(appointment);
    map.set(appointment.date, list);
  }
  return [...map.entries()].map(([date, dayAppointments]) => ({
    date,
    appointments: dayAppointments,
  }));
}

export function formatAgendaDayLabel(date: string): string {
  const parsed = parse(date, "yyyy-MM-dd", new Date());
  if (isToday(parsed)) {
    return `Hoy · ${format(parsed, "EEEE d MMM", { locale: es })}`;
  }
  if (isTomorrow(parsed)) {
    return `Mañana · ${format(parsed, "EEEE d MMM", { locale: es })}`;
  }
  return format(parsed, "EEEE d MMMM", { locale: es });
}

/** Split a day's appointments into morning (< 13:00) and afternoon. */
export function groupDayAppointmentsByPeriod(
  appointments: Appointment[],
): DayPeriodAgenda[] {
  const morning: Appointment[] = [];
  const afternoon: Appointment[] = [];
  for (const appointment of appointments) {
    const hour = Number(appointment.startTime.slice(0, 2));
    if (hour < 13) morning.push(appointment);
    else afternoon.push(appointment);
  }
  const periods: DayPeriodAgenda[] = [];
  if (morning.length) {
    periods.push({ period: "morning", label: "Mañana", appointments: morning });
  }
  if (afternoon.length) {
    periods.push({
      period: "afternoon",
      label: "Tarde",
      appointments: afternoon,
    });
  }
  return periods;
}

/**
 * Full day board: every clinic slot, marked available, past or taken.
 * Orphan confirmed appointments outside windows are appended.
 */
export function buildDaySchedule(
  date: string,
  appointments: Appointment[],
  doctor?: Pick<
    Doctor,
    "windows" | "slotMinutes" | "schedule" | "timezone"
  >,
  now = new Date(),
): DaySlot[] {
  const slotMinutes = doctor?.slotMinutes ?? clinic.slotMinutes;
  const confirmed = appointments.filter(
    (a) => a.status === "confirmed" && a.date === date,
  );
  const byStart = new Map(confirmed.map((a) => [a.startTime, a]));
  const slots: DaySlot[] = buildDaySlots(date, doctor).map((startTime) => {
    const appointment = byStart.get(startTime);
    const endTime = appointment?.endTime ?? endTimeFor(startTime, slotMinutes);
    if (appointment) {
      byStart.delete(startTime);
      return { startTime, endTime, status: "taken", appointment };
    }
    if (!isSlotBookable(date, startTime, doctor, now)) {
      return { startTime, endTime, status: "past" };
    }
    return { startTime, endTime, status: "available" };
  });

  // Appointments that don't match a generated slot still appear.
  for (const appointment of [...byStart.values()].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  )) {
    slots.push({
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: "taken",
      appointment,
    });
  }

  return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function groupDayScheduleByPeriod(
  slots: DaySlot[],
): DayPeriodSchedule[] {
  const morning: DaySlot[] = [];
  const afternoon: DaySlot[] = [];
  for (const slot of slots) {
    const hour = Number(slot.startTime.slice(0, 2));
    if (hour < 13) morning.push(slot);
    else afternoon.push(slot);
  }
  const periods: DayPeriodSchedule[] = [];
  if (morning.length) {
    periods.push({ period: "morning", label: "Mañana", slots: morning });
  }
  if (afternoon.length) {
    periods.push({ period: "afternoon", label: "Tarde", slots: afternoon });
  }
  return periods;
}

export function countTakenSlots(slots: DaySlot[]): number {
  return slots.filter((s) => s.status === "taken").length;
}

export function countAvailableSlots(slots: DaySlot[]): number {
  return slots.filter((s) => s.status === "available").length;
}

/** Hora actual HH:mm en la TZ del consultorio. */
export function clinicNowHm(now = new Date(), timezone = clinic.timezone): string {
  return format(toZonedTime(now, timezone), "HH:mm");
}

export function clinicTodayIso(
  now = new Date(),
  timezone = clinic.timezone,
): string {
  return format(toZonedTime(now, timezone), "yyyy-MM-dd");
}

/**
 * Slot de la lista más cercano a la hora actual:
 * el primero con startTime >= ahora, o el último si ya pasó todo.
 */
export function nearestSlotStartTime(
  slots: Pick<DaySlot, "startTime">[],
  nowHm: string,
): string | null {
  if (slots.length === 0) return null;
  const upcoming = slots.find((s) => s.startTime >= nowHm);
  return upcoming?.startTime ?? slots[slots.length - 1]?.startTime ?? null;
}

export function formatAgendaDayChip(date: string): string {
  const parsed = parse(date, "yyyy-MM-dd", new Date());
  if (isToday(parsed)) return "Hoy";
  if (isTomorrow(parsed)) return "Mañana";
  return format(parsed, "EEE", { locale: es });
}

export function weekStartFromDate(date: string | Date): Date {
  const parsed =
    typeof date === "string" ? parse(date, "yyyy-MM-dd", new Date()) : date;
  return startOfWeek(parsed, { weekStartsOn: WEEK_STARTS_ON });
}

export function shiftWeek(weekStart: Date, weeks: number): Date {
  return addWeeks(weekStart, weeks);
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `${format(weekStart, "d", { locale: es })}–${format(weekEnd, "d MMM yyyy", { locale: es })}`;
  }
  return `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`;
}

/** Mon–Fri slots for a week, filled with appointments when present. */
export function buildWeekDayAgenda(
  weekStart: Date,
  appointments: Appointment[],
): DayAgenda[] {
  const byDay = new Map(
    groupAppointmentsByDay(appointments).map((d) => [d.date, d.appointments]),
  );
  const monday = weekStartFromDate(weekStart);
  const friday = addDays(monday, 4);
  return eachDayOfInterval({ start: monday, end: friday }).map((day) => {
    const date = format(day, "yyyy-MM-dd");
    return { date, appointments: byDay.get(date) ?? [] };
  });
}

export function initialWeekStart(appointments: Appointment[], now = new Date()): Date {
  const todayWeek = weekStartFromDate(now);
  const grouped = groupAppointmentsByDay(appointments);
  if (grouped.some((d) => weekStartFromDate(d.date).getTime() === todayWeek.getTime())) {
    return todayWeek;
  }
  const first = grouped[0]?.date;
  return first ? weekStartFromDate(first) : todayWeek;
}

export function weekHasAppointments(
  weekStart: Date,
  appointments: Appointment[],
): boolean {
  return buildWeekDayAgenda(weekStart, appointments).some(
    (d) => d.appointments.length > 0,
  );
}
