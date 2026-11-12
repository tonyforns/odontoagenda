import { describe, expect, it } from "vitest";
import {
  isStaffRole,
  normalizeEmail,
  resolveAppRoleFromStaff,
} from "@/lib/staff-role";
import { DEFAULT_ADMIN_EMAIL, adminStaffSeed } from "@/lib/staff-seed";
import type { ClinicStaff } from "@/lib/types";

describe("staff-role", () => {
  it("normalizeEmail lowercases and trims", () => {
    expect(normalizeEmail("  IaForns@Gmail.COM ")).toBe("iaforns@gmail.com");
  });

  it("isStaffRole accepts admin/medico/secretaria", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("medico")).toBe(true);
    expect(isStaffRole("secretaria")).toBe(true);
    expect(isStaffRole("paciente")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });

  it("resolveAppRoleFromStaff uses active staff role", () => {
    const admin = adminStaffSeed();
    expect(admin.email).toBe(DEFAULT_ADMIN_EMAIL);
    expect(resolveAppRoleFromStaff(admin)).toBe("admin");
  });

  it("resolveAppRoleFromStaff returns paciente when inactive or missing", () => {
    expect(resolveAppRoleFromStaff(null)).toBe("paciente");
    const inactive: ClinicStaff = {
      ...adminStaffSeed(),
      active: false,
    };
    expect(resolveAppRoleFromStaff(inactive)).toBe("paciente");
  });

  it("medico seed requires doctorId constraint shape", () => {
    const medico: ClinicStaff = {
      id: "staff_medico_test",
      email: "medico@example.com",
      role: "medico",
      doctorId: "doc_rafael_lovera",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(resolveAppRoleFromStaff(medico)).toBe("medico");
    expect(medico.doctorId).toBeTruthy();
  });
});

describe("requireStaffSession shape", () => {
  it("admin seed is the configured Gmail", () => {
    expect(DEFAULT_ADMIN_EMAIL).toBe("iaforns@gmail.com");
    expect(adminStaffSeed().role).toBe("admin");
    expect(adminStaffSeed().doctorId).toBeNull();
  });
});
