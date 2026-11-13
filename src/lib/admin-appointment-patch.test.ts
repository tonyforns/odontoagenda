import { describe, expect, it } from "vitest";
import { adminAppointmentPatchSchema } from "./admin-appointment-patch";

describe("adminAppointmentPatchSchema", () => {
  it("accepts cancel", () => {
    expect(
      adminAppointmentPatchSchema.safeParse({ action: "cancel" }).success,
    ).toBe(true);
  });

  it("accepts reschedule with date and time", () => {
    expect(
      adminAppointmentPatchSchema.safeParse({
        action: "reschedule",
        date: "2026-11-20",
        startTime: "10:00",
      }).success,
    ).toBe(true);
  });

  it("rejects reschedule without slot", () => {
    expect(
      adminAppointmentPatchSchema.safeParse({ action: "reschedule" }).success,
    ).toBe(false);
  });
});
