import type { ClinicStaff, StaffRole } from "@/lib/types";

/** Un admin no puede desactivarse a sí mismo ni a otro admin. */
export function canDeactivateStaff(member: Pick<ClinicStaff, "role">): boolean {
  return member.role !== "admin";
}

export function staffDeactivateBlockedMessage(): string {
  return "No se puede desactivar a un administrador.";
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

  return { ok: true };
}
