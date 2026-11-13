import { describe, expect, it } from "vitest";
import { adminAppointmentPatchSchema } from "./admin-appointment-patch";

describe("admin appointment patch", () => {
  it("accepts cancel action", () => {
    expect(
      adminAppointmentPatchSchema.safeParse({ action: "cancel" }).success,
    ).toBe(true);
  });

  it("accepts reschedule with date and time", () => {
    expect(
      adminAppointmentPatchSchema.safeParse({
        action: "reschedule",
        date: "2026-11-20",
        startTime: "09:00",
      }).success,
    ).toBe(true);
  });
});
