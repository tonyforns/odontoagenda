import { getDay, parse } from "date-fns";
import { randomUUID } from "crypto";
import type {
  Doctor,
  DoctorScheduleWindow,
  DoctorWindow,
} from "@/lib/types";

export function weekdayFromDate(date: string): number {
  return getDay(parse(date, "yyyy-MM-dd", new Date()));
}

/** Expande workDays × windows al modelo por día (seed / fallback local). */
export function expandScheduleFromLegacy(
  doctorId: string,
  workDays: number[],
  windows: DoctorWindow[],
): DoctorScheduleWindow[] {
  const rows: DoctorScheduleWindow[] = [];
  for (const weekday of [...workDays].sort((a, b) => a - b)) {
    for (const window of windows) {
      rows.push({
        id: `dsw_${doctorId}_${weekday}_${window.start.replace(":", "")}`,
        doctorId,
        weekday,
        startTime: window.start,
        endTime: window.end,
      });
    }
  }
  return rows;
}

export function workDaysFromSchedule(
  schedule: DoctorScheduleWindow[],
): number[] {
  return [...new Set(schedule.map((w) => w.weekday))].sort((a, b) => a - b);
}

export function windowsForWeekday(
  schedule: DoctorScheduleWindow[],
  weekday: number,
): DoctorWindow[] {
  return schedule
    .filter((w) => w.weekday === weekday)
    .map((w) => ({ start: w.startTime, end: w.endTime }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function windowsForDate(
  schedule: DoctorScheduleWindow[],
  date: string,
): DoctorWindow[] {
  return windowsForWeekday(schedule, weekdayFromDate(date));
}

/** Asegura `schedule` y alinea `workDays` derivados. */
export function withDoctorSchedule(doctor: Doctor): Doctor {
  const schedule =
    doctor.schedule && doctor.schedule.length > 0
      ? [...doctor.schedule].sort(
          (a, b) =>
            a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
        )
      : expandScheduleFromLegacy(doctor.id, doctor.workDays, doctor.windows);

  return {
    ...doctor,
    schedule,
    workDays: workDaysFromSchedule(schedule),
  };
}

export function newScheduleWindowId(): string {
  return `dsw_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function buildScheduleRows(
  doctorId: string,
  windows: Array<{ weekday: number; startTime: string; endTime: string }>,
): DoctorScheduleWindow[] {
  return windows
    .map((window) => ({
      id: newScheduleWindowId(),
      doctorId,
      weekday: window.weekday,
      startTime: window.startTime,
      endTime: window.endTime,
    }))
    .sort(
      (a, b) =>
        a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
    );
}
