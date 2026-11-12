import { randomUUID } from "crypto";
import {
  ensureSchema,
  getPool,
  hasDatabaseUrl,
  rowToPatient,
} from "@/lib/db";
import { splitGoogleName } from "@/lib/patient-utils";
import type { Patient, PatientProfileInput } from "@/lib/types";
import * as fileStore from "@/lib/store";

export {
  isProfileComplete,
  patientDisplayName,
  splitGoogleName,
} from "@/lib/patient-utils";

export async function getByGoogleSub(
  googleSub: string,
): Promise<Patient | undefined> {
  if (!hasDatabaseUrl()) return fileStore.getPatientByGoogleSub(googleSub);
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT * FROM patients WHERE google_sub = $1`,
    [googleSub],
  );
  return rows[0] ? rowToPatient(rows[0]) : undefined;
}

export async function getPatientById(
  id: string,
): Promise<Patient | undefined> {
  if (!hasDatabaseUrl()) return fileStore.getPatientById(id);
  await ensureSchema();
  const { rows } = await getPool().query(`SELECT * FROM patients WHERE id = $1`, [
    id,
  ]);
  return rows[0] ? rowToPatient(rows[0]) : undefined;
}

export async function upsertFromGoogleSession(input: {
  googleSub: string;
  email: string;
  name?: string | null;
  refreshToken?: string | null;
}): Promise<Patient> {
  if (!hasDatabaseUrl()) return fileStore.upsertPatientFromGoogle(input);

  await ensureSchema();
  const existing = await getByGoogleSub(input.googleSub);
  const email = input.email.trim().toLowerCase();
  const split = splitGoogleName(input.name);
  const now = new Date().toISOString();

  if (existing) {
    const { rows } = await getPool().query(
      `UPDATE patients SET
        email = $2,
        first_name = CASE WHEN first_name = '' THEN $3 ELSE first_name END,
        last_name = CASE WHEN last_name = '' THEN $4 ELSE last_name END,
        google_refresh_token = COALESCE($5, google_refresh_token),
        updated_at = $6
       WHERE google_sub = $1
       RETURNING *`,
      [
        input.googleSub,
        email,
        split.firstName,
        split.lastName,
        input.refreshToken ?? null,
        now,
      ],
    );
    return rowToPatient(rows[0]);
  }

  const { rows } = await getPool().query(
    `INSERT INTO patients (
      id, google_sub, email, first_name, last_name, google_refresh_token,
      created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [
      randomUUID(),
      input.googleSub,
      email,
      split.firstName,
      split.lastName,
      input.refreshToken ?? null,
      now,
      now,
    ],
  );
  return rowToPatient(rows[0]);
}

export async function updateProfile(
  googleSub: string,
  profile: PatientProfileInput,
): Promise<Patient | undefined> {
  if (!hasDatabaseUrl()) {
    return fileStore.updatePatientProfile(googleSub, profile);
  }

  await ensureSchema();
  const now = new Date().toISOString();
  const { rows } = await getPool().query(
    `UPDATE patients SET
      first_name = $2,
      last_name = $3,
      dni = $4,
      birth_date = $5,
      sex = $6,
      obra_social = $7,
      phone = $8,
      updated_at = $9
     WHERE google_sub = $1
     RETURNING *`,
    [
      googleSub,
      profile.firstName.trim(),
      profile.lastName.trim(),
      profile.dni,
      profile.birthDate,
      profile.sex,
      profile.obraSocial.trim(),
      profile.phone.trim(),
      now,
    ],
  );
  return rows[0] ? rowToPatient(rows[0]) : undefined;
}
