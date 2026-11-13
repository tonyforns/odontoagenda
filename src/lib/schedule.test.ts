import { describe, expect, it } from "vitest";
import {
  expandScheduleFromLegacy,
  weekdayFromDate,
  windowsForDate,
  withDoctorSchedule,
  workDaysFromSchedule,
} from "./schedule";
import type { Doctor } from "./types";

describe("weekdayFromDate", () => {
  it("usa el mismo índice que date-fns (0=dom)", () => {
    expect(weekdayFromDate("2026-03-15")).toBe(0); // domingo
    expect(weekdayFromDate("2026-03-11")).toBe(3); // miércoles
  });
});

describe("expandScheduleFromLegacy", () => {
  it("multiplica días × franjas", () => {
    const rows = expandScheduleFromLegacy(
      "doc_x",
      [1, 5],
      [
        { start: "09:00", end: "12:00" },
        { start: "15:00", end: "18:00" },
      ],
    );
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.weekday)).toEqual([1, 1, 5, 5]);
  });
});

describe("windowsForDate", () => {
  it("devuelve solo las franjas del weekday", () => {
    const schedule = expandScheduleFromLegacy(
      "doc_x",
      [1, 3],
      [{ start: "09:00", end: "10:00" }],
    );
    // miércoles = 3 → tiene franja; martes = 2 → vacío
    expect(windowsForDate(schedule, "2026-03-11")).toEqual([
      { start: "09:00", end: "10:00" },
    ]);
    expect(windowsForDate(schedule, "2026-03-10")).toEqual([]);
  });
});

describe("withDoctorSchedule", () => {
  it("deriva schedule desde legacy si falta", () => {
    const doctor = {
      id: "doc_x",
      workDays: [1, 2],
      windows: [{ start: "09:00", end: "12:00" }],
      schedule: [],
    } as unknown as Doctor;
    const hydrated = withDoctorSchedule(doctor);
    expect(hydrated.schedule).toHaveLength(2);
    expect(workDaysFromSchedule(hydrated.schedule)).toEqual([1, 2]);
  });
});
