import type { AppRole, ClinicStaff, StaffRole } from "@/lib/types";

export const STAFF_ROLES: readonly StaffRole[] = [
  "admin",
  "medico",
  "secretaria",
] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === "admin" || role === "medico" || role === "secretaria";
}

export function resolveAppRoleFromStaff(
  staff: ClinicStaff | null | undefined,
): AppRole {
  if (staff?.active && isStaffRole(staff.role)) return staff.role;
  return "paciente";
}
