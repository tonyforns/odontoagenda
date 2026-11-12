import { randomUUID } from "crypto";
import { clinic } from "@/lib/clinic";
import {
  ensureSchema,
  getPool,
  rowToClinicStaff,
  useDatabase,
} from "@/lib/db";
import {
  DEFAULT_ADMIN_EMAIL,
  adminStaffSeed,
  medicoStaffSeedFromEnv,
} from "@/lib/staff-seed";
import {
  isStaffRole,
  normalizeEmail,
  resolveAppRoleFromStaff,
  STAFF_ROLES,
} from "@/lib/staff-role";
import { validateStaffPatch } from "@/lib/staff-rules";
import type { AppRole, ClinicStaff, StaffRole } from "@/lib/types";
import * as fileStore from "@/lib/store";

export {
  DEFAULT_ADMIN_EMAIL,
  adminStaffSeed,
  medicoStaffSeedFromEnv,
  isStaffRole,
  normalizeEmail,
  resolveAppRoleFromStaff,
  STAFF_ROLES,
};

export async function findActiveStaff(opts: {
  email?: string | null;
  googleSub?: string | null;
}): Promise<ClinicStaff | null> {
  const email = opts.email ? normalizeEmail(opts.email) : null;
  const googleSub = opts.googleSub?.trim() || null;

  if (await useDatabase()) {
    await ensureSchema();
    if (googleSub) {
      const bySub = await getPool().query(
        `SELECT * FROM clinic_staff
         WHERE google_sub = $1 AND active = TRUE
         LIMIT 1`,
        [googleSub],
      );
      if (bySub.rows[0]) return rowToClinicStaff(bySub.rows[0]);
    }
    if (email) {
      const byEmail = await getPool().query(
        `SELECT * FROM clinic_staff
         WHERE email = $1 AND active = TRUE
         LIMIT 1`,
        [email],
      );
      if (byEmail.rows[0]) return rowToClinicStaff(byEmail.rows[0]);
    }
    return null;
  }

  return fileStore.findActiveStaff({ email, googleSub });
}

export async function linkStaffGoogleSub(input: {
  email: string;
  googleSub: string;
}): Promise<ClinicStaff | null> {
  const email = normalizeEmail(input.email);
  const googleSub = input.googleSub.trim();
  if (!email || !googleSub) return null;

  if (await useDatabase()) {
    await ensureSchema();
    const { rows } = await getPool().query(
      `UPDATE clinic_staff
       SET google_sub = $1, updated_at = NOW()
       WHERE email = $2 AND active = TRUE
       RETURNING *`,
      [googleSub, email],
    );
    return rows[0] ? rowToClinicStaff(rows[0]) : null;
  }

  return fileStore.linkStaffGoogleSub({ email, googleSub });
}

export async function resolveAppRole(opts: {
  email?: string | null;
  googleSub?: string | null;
}): Promise<{ role: AppRole; staff: ClinicStaff | null }> {
  const staff = await findActiveStaff(opts);
  return { role: resolveAppRoleFromStaff(staff), staff };
}

export type StaffGate =
  | { ok: true; staff: ClinicStaff; role: StaffRole }
  | { ok: false; status: 401 | 403; error: string };

/** Autoriza APIs de consultorio: sesión Gmail con rol staff activo. */
export async function requireStaffSession(session: {
  user?: {
    email?: string | null;
    googleSub?: string;
    role?: AppRole;
  } | null;
} | null): Promise<StaffGate> {
  if (!session?.user) {
    return { ok: false, status: 401, error: "Iniciá sesión con Gmail." };
  }

  const { role, staff } = await resolveAppRole({
    email: session.user.email,
    googleSub: session.user.googleSub,
  });

  if (!staff || !isStaffRole(role)) {
    return {
      ok: false,
      status: 403,
      error: "No tenés acceso al consultorio.",
    };
  }

  return { ok: true, staff, role };
}

/** Solo rol admin (panel /admin). */
export async function requireAdminSession(session: {
  user?: {
    email?: string | null;
    googleSub?: string;
    role?: AppRole;
  } | null;
} | null): Promise<StaffGate> {
  const gate = await requireStaffSession(session);
  if (!gate.ok) return gate;
  if (gate.role !== "admin") {
    return {
      ok: false,
      status: 403,
      error: "Solo administradores.",
    };
  }
  return gate;
}

function doctorIdForRole(role: StaffRole): string | null {
  return role === "medico" ? clinic.defaultDoctorId : null;
}

export async function listStaff(): Promise<ClinicStaff[]> {
  if (await useDatabase()) {
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT * FROM clinic_staff ORDER BY email ASC`,
    );
    return rows.map(rowToClinicStaff);
  }
  return fileStore.listStaff();
}

export async function upsertStaffMember(input: {
  email: string;
  role: StaffRole;
}): Promise<ClinicStaff> {
  const email = normalizeEmail(input.email);
  const role = input.role;
  const doctorId = doctorIdForRole(role);

  if (await useDatabase()) {
    await ensureSchema();
    const id = `staff_${randomUUID()}`;
    const { rows } = await getPool().query(
      `INSERT INTO clinic_staff (id, email, role, doctor_id, active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (email) DO UPDATE SET
         role = EXCLUDED.role,
         doctor_id = EXCLUDED.doctor_id,
         active = TRUE,
         updated_at = NOW()
       RETURNING *`,
      [id, email, role, doctorId],
    );
    return rowToClinicStaff(rows[0]);
  }

  return fileStore.upsertStaffMember({ email, role, doctorId });
}

export async function getStaffById(id: string): Promise<ClinicStaff | null> {
  if (await useDatabase()) {
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT * FROM clinic_staff WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? rowToClinicStaff(rows[0]) : null;
  }
  return fileStore.getStaffById(id);
}

export type StaffPatchResult =
  | { ok: true; staff: ClinicStaff }
  | { ok: false; status: 400 | 404; error: string };

export async function patchStaffMember(
  id: string,
  patch: { active?: boolean; role?: StaffRole },
): Promise<StaffPatchResult> {
  const current = await getStaffById(id);
  if (!current) {
    return { ok: false, status: 404, error: "Personal no encontrado" };
  }

  const check = validateStaffPatch(current, patch);
  if (!check.ok) {
    return { ok: false, status: 400, error: check.error };
  }

  const nextRole = patch.role ?? current.role;
  const nextActive = patch.active ?? current.active;
  const doctorId = doctorIdForRole(nextRole);

  if (await useDatabase()) {
    await ensureSchema();
    const { rows } = await getPool().query(
      `UPDATE clinic_staff
       SET role = $1, doctor_id = $2, active = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [nextRole, doctorId, nextActive, id],
    );
    if (!rows[0]) {
      return { ok: false, status: 404, error: "Personal no encontrado" };
    }
    return { ok: true, staff: rowToClinicStaff(rows[0]) };
  }

  const staff = await fileStore.patchStaffMember(id, {
    role: nextRole,
    doctorId,
    active: nextActive,
  });
  if (!staff) {
    return { ok: false, status: 404, error: "Personal no encontrado" };
  }
  return { ok: true, staff };
}
