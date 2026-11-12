import { describe, expect, it } from "vitest";
import { buildDaySlots, endTimeFor, isWorkDay } from "@/lib/slots";

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
});
