import { DEFAULT_DOCTOR_SEED, clinic } from "@/lib/clinic";
import {
  ensureSchema,
  getPool,
  hasDatabaseUrl,
  rowToDoctor,
} from "@/lib/db";
import type { Doctor } from "@/lib/types";
import * as fileStore from "@/lib/store";

export async function getDefaultDoctor(): Promise<Doctor> {
  return getDoctorById(clinic.defaultDoctorId);
}

export async function getDoctorById(id: string): Promise<Doctor> {
  if (!hasDatabaseUrl()) return fileStore.getDoctorById(id);

  await ensureSchema();
  const { rows } = await getPool().query(`SELECT * FROM doctors WHERE id = $1`, [
    id,
  ]);
  if (!rows[0]) {
    // Should be seeded by ensureSchema; return in-memory fallback
    const now = new Date().toISOString();
    return { ...DEFAULT_DOCTOR_SEED, createdAt: now, updatedAt: now };
  }
  return rowToDoctor(rows[0]);
}

export async function verifyDoctorPin(
  pin: string,
  doctorId = clinic.defaultDoctorId,
): Promise<boolean> {
  const doctor = await getDoctorById(doctorId);
  const expected = process.env.DOCTOR_PIN || doctor.pin;
  return pin === expected;
}
