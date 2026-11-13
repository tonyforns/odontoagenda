import { describe, expect, it } from "vitest";
import {
  buildDaySlots,
  endTimeFor,
  isClinicDatePast,
  isSlotBookable,
  isWorkDay,
} from "@/lib/slots";

describe("endTimeFor", () => {
  it("adds slot minutes", () => {
    expect(endTimeFor("10:00", 30)).toBe("10:30");
  });
});

describe("isWorkDay", () => {
  it("marks weekdays as work days by default", () => {
    // 2026-03-11 is Wednesday
    expect(isWorkDay("2026-03-11")).toBe(true);
  });

  it("rejects Sunday", () => {
    expect(isWorkDay("2026-03-15")).toBe(false);
  });
});

describe("isClinicDatePast / isSlotBookable", () => {
  it("marca días anteriores como pasados", () => {
    const now = new Date("2026-11-12T15:00:00-03:00");
    expect(isClinicDatePast("2026-11-11", undefined, now)).toBe(true);
    expect(isClinicDatePast("2026-11-12", undefined, now)).toBe(false);
  });

  it("deshabilita horarios de hoy que ya pasaron (buffer 1h)", () => {
    const now = new Date("2026-11-12T15:00:00-03:00");
    expect(isSlotBookable("2026-11-12", "14:00", undefined, now)).toBe(false);
    expect(isSlotBookable("2026-11-12", "16:30", undefined, now)).toBe(true);
    expect(isSlotBookable("2026-11-13", "09:00", undefined, now)).toBe(true);
  });
});

describe("buildDaySlots", () => {
  it("builds 30-minute slots inside clinic windows", () => {
    const slots = buildDaySlots("2026-03-11", {
      windows: [
        { start: "09:00", end: "10:00" },
        { start: "15:00", end: "16:00" },
      ],
      slotMinutes: 30,
    });
    expect(slots).toEqual(["09:00", "09:30", "15:00", "15:30"]);
  });

  it("usa franjas del weekday desde schedule", () => {
    const slots = buildDaySlots("2026-03-11", {
      windows: [{ start: "09:00", end: "10:00" }],
      slotMinutes: 30,
      schedule: [
        {
          id: "a",
          doctorId: "doc",
          weekday: 3,
          startTime: "15:00",
          endTime: "16:00",
        },
      ],
    });
    expect(slots).toEqual(["15:00", "15:30"]);
  });
});
