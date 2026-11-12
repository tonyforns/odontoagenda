import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  buildDaySchedule,
  buildWeekDayAgenda,
  countTakenSlots,
  groupAppointmentsByDay,
  groupDayAppointmentsByPeriod,
  groupDayScheduleByPeriod,
  initialWeekStart,
  shiftWeek,
  weekStartFromDate,
} from "@/lib/agenda";
import type { Appointment } from "@/lib/types";

function appt(
  partial: Pick<Appointment, "id" | "date" | "startTime" | "status"> &
    Partial<Appointment>,
): Appointment {
  return {
    doctorId: "doc",
    patientId: "pat",
    durationMinutes: 30,
    endTime: "00:30",
    manageToken: "token-token-token",
    calendarMode: "mock",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("groupAppointmentsByDay", () => {
  it("groups confirmed appointments by date and sorts slots", () => {
    const groups = groupAppointmentsByDay([
      appt({ id: "2", date: "2026-03-12", startTime: "10:00", status: "confirmed" }),
      appt({ id: "1", date: "2026-03-11", startTime: "15:00", status: "confirmed" }),
      appt({ id: "3", date: "2026-03-11", startTime: "09:00", status: "confirmed" }),
      appt({ id: "x", date: "2026-03-11", startTime: "11:00", status: "cancelled" }),
    ]);

    expect(groups.map((g) => g.date)).toEqual(["2026-03-11", "2026-03-12"]);
    expect(groups[0]?.appointments.map((a) => a.id)).toEqual(["3", "1"]);
    expect(groups[1]?.appointments.map((a) => a.id)).toEqual(["2"]);
  });

  it("returns empty for no confirmed appointments", () => {
    expect(
      groupAppointmentsByDay([
        appt({ id: "x", date: "2026-03-11", startTime: "09:00", status: "cancelled" }),
      ]),
    ).toEqual([]);
  });
});

describe("week agenda", () => {
  it("builds Mon–Fri for the week", () => {
    const week = weekStartFromDate("2026-03-11"); // Wednesday → week of Mar 9
    const days = buildWeekDayAgenda(week, [
      appt({ id: "1", date: "2026-03-11", startTime: "09:00", status: "confirmed" }),
      appt({ id: "2", date: "2026-03-14", startTime: "10:00", status: "confirmed" }), // Saturday ignored in chips
    ]);
    expect(days.map((d) => d.date)).toEqual([
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
      "2026-03-13",
    ]);
    expect(days[2]?.appointments.map((a) => a.id)).toEqual(["1"]);
  });

  it("shifts weeks", () => {
    const week = weekStartFromDate("2026-03-11");
    expect(formatDate(shiftWeek(week, 1))).toBe("2026-03-16");
  });

  it("picks current week when it has appointments", () => {
    const start = initialWeekStart(
      [appt({ id: "1", date: "2026-03-11", startTime: "09:00", status: "confirmed" })],
      new Date("2026-03-11T12:00:00"),
    );
    expect(formatDate(start)).toBe("2026-03-09");
  });

  it("jumps to the week that contains a picked day", () => {
    expect(formatDate(weekStartFromDate("2026-03-20"))).toBe("2026-03-16");
  });
});

describe("groupDayAppointmentsByPeriod", () => {
  it("splits morning and afternoon", () => {
    const periods = groupDayAppointmentsByPeriod([
      appt({ id: "1", date: "2026-03-11", startTime: "09:00", status: "confirmed" }),
      appt({ id: "2", date: "2026-03-11", startTime: "15:30", status: "confirmed" }),
      appt({ id: "3", date: "2026-03-11", startTime: "11:00", status: "confirmed" }),
    ]);
    expect(periods.map((p) => p.period)).toEqual(["morning", "afternoon"]);
    expect(periods[0]?.appointments.map((a) => a.id)).toEqual(["1", "3"]);
    expect(periods[1]?.appointments.map((a) => a.id)).toEqual(["2"]);
  });
});

describe("buildDaySchedule", () => {
  it("shows available and taken slots for the full day board", () => {
    const schedule = buildDaySchedule("2026-03-11", [
      appt({
        id: "1",
        date: "2026-03-11",
        startTime: "09:00",
        status: "confirmed",
        endTime: "09:30",
      }),
      appt({
        id: "2",
        date: "2026-03-11",
        startTime: "15:00",
        status: "confirmed",
        endTime: "15:30",
      }),
    ]);

    expect(schedule.length).toBeGreaterThan(2);
    expect(schedule.find((s) => s.startTime === "09:00")?.status).toBe("taken");
    expect(schedule.find((s) => s.startTime === "09:30")?.status).toBe(
      "available",
    );
    expect(countTakenSlots(schedule)).toBe(2);
    expect(groupDayScheduleByPeriod(schedule).map((p) => p.period)).toEqual([
      "morning",
      "afternoon",
    ]);
  });
});

function formatDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}
