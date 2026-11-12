import { clinic } from "@/lib/clinic";
import type { ClinicStaff } from "@/lib/types";

/** Admin seed canónico (typo gamil → gmail). */
export const DEFAULT_ADMIN_EMAIL = "iaforns@gmail.com";

export function adminStaffSeed(): ClinicStaff {
  const now = new Date().toISOString();
  return {
    id: "staff_admin_iaforns",
    email: DEFAULT_ADMIN_EMAIL,
    googleSub: null,
    role: "admin",
    doctorId: null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Opcional: Gmail del médico vía STAFF_MEDICO_EMAIL. */
export function medicoStaffSeedFromEnv(): ClinicStaff | null {
  const email = (process.env.STAFF_MEDICO_EMAIL ?? "").trim().toLowerCase();
  if (!email) return null;
  const now = new Date().toISOString();
  return {
    id: `staff_medico_${email.replace(/[^a-z0-9]+/g, "_")}`,
    email,
    googleSub: null,
    role: "medico",
    doctorId: clinic.defaultDoctorId,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}
