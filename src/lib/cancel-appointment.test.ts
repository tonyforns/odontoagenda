import { describe, expect, it } from "vitest";
import { z } from "zod";

const adminAppointmentPatchSchema = z.object({
  action: z.literal("cancel"),
});

describe("admin appointment cancel payload", () => {
  it("accepts cancel action", () => {
    expect(
      adminAppointmentPatchSchema.safeParse({ action: "cancel" }).success,
    ).toBe(true);
  });

  it("rejects other actions", () => {
    expect(
      adminAppointmentPatchSchema.safeParse({ action: "reschedule" }).success,
    ).toBe(false);
  });
});
