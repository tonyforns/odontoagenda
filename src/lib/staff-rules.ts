import { DEFAULT_ADMIN_EMAIL } from "@/lib/staff-seed";
import type { ClinicStaff, StaffRole } from "@/lib/types";

/** Un admin no puede desactivarse a sí mismo ni a otro admin. */
export function canDeactivateStaff(member: Pick<ClinicStaff, "role">): boolean {
  return member.role !== "admin";
}

export function staffDeactivateBlockedMessage(): string {
  return "No se puede desactivar a un administrador.";
}

/** Seed canónico: no se le cambia el rol (siempre admin). */
export function isProtectedAdmin(
  member: Pick<ClinicStaff, "email">,
): boolean {
  return member.email.trim().toLowerCase() === DEFAULT_ADMIN_EMAIL;
}

export function canChangeStaffRole(member: Pick<ClinicStaff, "email">): boolean {
  return !isProtectedAdmin(member);
}

export function staffRoleChangeBlockedMessage(): string {
  return "No se puede cambiar el rol del administrador principal.";
}

export type StaffPatchInput = {
  active?: boolean;
  role?: StaffRole;
};

export function validateStaffPatch(
  member: ClinicStaff,
  patch: StaffPatchInput,
): { ok: true } | { ok: false; error: string } {
  if (patch.active === undefined && patch.role === undefined) {
    return { ok: false, error: "Nada para actualizar." };
  }

  if (patch.active === false && !canDeactivateStaff(member)) {
    return { ok: false, error: staffDeactivateBlockedMessage() };
  }

  if (
    patch.role !== undefined &&
    patch.role !== member.role &&
    !canChangeStaffRole(member)
  ) {
    return { ok: false, error: staffRoleChangeBlockedMessage() };
  }

  return { ok: true };
}
