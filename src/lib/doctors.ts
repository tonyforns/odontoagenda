import { DEFAULT_DOCTOR_SEED, clinic } from "@/lib/clinic";
import {
  ensureSchema,
  getPool,
  rowToDoctor,
  useDatabase,
} from "@/lib/db";
import { hydrateDoctorSchedule } from "@/lib/doctor-schedule";
import { withDoctorSchedule } from "@/lib/schedule";
import type { Doctor } from "@/lib/types";
import * as fileStore from "@/lib/store";

export async function getDefaultDoctor(): Promise<Doctor> {
  return getDoctorById(clinic.defaultDoctorId);
}

export async function getDoctorById(id: string): Promise<Doctor> {
  if (!(await useDatabase())) {
    return withDoctorSchedule(await fileStore.getDoctorById(id));
  }

  await ensureSchema();
  const { rows } = await getPool().query(`SELECT * FROM doctors WHERE id = $1`, [
    id,
  ]);
  if (!rows[0]) {
    // Should be seeded by ensureSchema; return in-memory fallback
    const now = new Date().toISOString();
    return withDoctorSchedule({
      ...DEFAULT_DOCTOR_SEED,
      createdAt: now,
      updatedAt: now,
    });
  }
  return hydrateDoctorSchedule(rowToDoctor(rows[0]));
}

