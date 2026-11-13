import { clinic } from "@/lib/clinic";
import {
  ensureSchema,
  getPool,
  rowToDoctorScheduleWindow,
  useDatabase,
} from "@/lib/db";
import { buildScheduleRows, withDoctorSchedule } from "@/lib/schedule";
import {
  legacyWindowsFromSchedule,
  validateScheduleWindows,
  workDaysFromWindowInputs,
  type ScheduleWindowInput,
} from "@/lib/schedule-rules";
import type { Doctor, DoctorScheduleWindow } from "@/lib/types";
import * as fileStore from "@/lib/store";

export async function listDoctorScheduleWindows(
  doctorId: string,
): Promise<DoctorScheduleWindow[]> {
  if (!(await useDatabase())) {
    const doctor = await fileStore.getDoctorById(doctorId);
    return withDoctorSchedule(doctor).schedule;
  }

  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT * FROM doctor_schedule_windows
     WHERE doctor_id = $1
     ORDER BY weekday ASC, start_time ASC`,
    [doctorId],
  );
  return rows.map(rowToDoctorScheduleWindow);
}

/** Adjunta `schedule` desde DB (o expande legacy). */
export async function hydrateDoctorSchedule(doctor: Doctor): Promise<Doctor> {
  if (!(await useDatabase())) {
    return withDoctorSchedule(doctor);
  }

  const schedule = await listDoctorScheduleWindows(doctor.id);
  return withDoctorSchedule({ ...doctor, schedule });
}

export async function replaceDoctorSchedule(
  doctorId: string,
  windows: ScheduleWindowInput[],
): Promise<DoctorScheduleWindow[]> {
  const invalid = validateScheduleWindows(windows);
  if (invalid) {
    throw new Error(invalid);
  }

  const schedule = buildScheduleRows(doctorId, windows);
  const workDays = workDaysFromWindowInputs(windows);
  const legacyWindows = legacyWindowsFromSchedule(windows);

  if (!(await useDatabase())) {
    return fileStore.replaceDoctorSchedule(doctorId, schedule, {
      workDays,
      windows: legacyWindows,
    });
  }

  await ensureSchema();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const doctor = await client.query(`SELECT id FROM doctors WHERE id = $1`, [
      doctorId,
    ]);
    if (!doctor.rows[0]) {
      throw new Error("Doctor no encontrado.");
    }

    await client.query(
      `DELETE FROM doctor_schedule_windows WHERE doctor_id = $1`,
      [doctorId],
    );

    for (const window of schedule) {
      await client.query(
        `INSERT INTO doctor_schedule_windows (
          id, doctor_id, weekday, start_time, end_time
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          window.id,
          window.doctorId,
          window.weekday,
          window.startTime,
          window.endTime,
        ],
      );
    }

    await client.query(
      `UPDATE doctors
       SET work_days = $2,
           windows_json = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [doctorId, JSON.stringify(workDays), JSON.stringify(legacyWindows)],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return schedule;
}

export function resolveScheduleDoctorId(doctorId?: string | null): string {
  return doctorId?.trim() || clinic.defaultDoctorId;
}
