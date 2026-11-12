import { describe, expect, it } from "vitest";
import {
  canDeactivateStaff,
  validateStaffPatch,
} from "@/lib/staff-rules";
import { adminStaffSeed } from "@/lib/staff-seed";
import type { ClinicStaff } from "@/lib/types";

const secretaria: ClinicStaff = {
  id: "staff_sec",
  email: "sec@gmail.com",
  role: "secretaria",
  doctorId: null,
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("staff-rules", () => {
  it("blocks deactivating an admin", () => {
    expect(canDeactivateStaff(adminStaffSeed())).toBe(false);
    const blocked = validateStaffPatch(adminStaffSeed(), { active: false });
    expect(blocked.ok).toBe(false);
  });

  it("allows deactivating non-admin", () => {
    expect(canDeactivateStaff(secretaria)).toBe(true);
    expect(validateStaffPatch(secretaria, { active: false }).ok).toBe(true);
  });

  it("allows changing roles including admin", () => {
    expect(
      validateStaffPatch(adminStaffSeed(), { role: "secretaria" }).ok,
    ).toBe(true);
    expect(validateStaffPatch(secretaria, { role: "medico" }).ok).toBe(true);
  });

  it("rejects empty patch", () => {
    expect(validateStaffPatch(secretaria, {}).ok).toBe(false);
  });
});
