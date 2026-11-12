import { randomBytes, randomUUID } from "crypto";
import { clinic } from "@/lib/clinic";
import { getDoctorById } from "@/lib/doctors";
import {
  APPOINTMENT_SELECT,
  ensureSchema,
  getPool,
  hasDatabaseUrl,
  rowToAppointment,
} from "@/lib/db";
import { endTimeFor } from "@/lib/slots";
import type { Appointment, CreateAppointmentInput } from "@/lib/types";
import * as fileStore from "@/lib/store";

export async function listAppointments(): Promise<Appointment[]> {
  if (!hasDatabaseUrl()) return fileStore.listAppointments();
  await ensureSchema();
  const { rows } = await getPool().query(
    `${APPOINTMENT_SELECT} ORDER BY a.date DESC, a.start_time DESC`,
  );
  return rows.map(rowToAppointment);
}

export async function listConfirmedAppointments(
  doctorId: string = clinic.defaultDoctorId,
): Promise<Appointment[]> {
  if (!hasDatabaseUrl()) return fileStore.listConfirmedAppointments(doctorId);
  await ensureSchema();
  const { rows } = await getPool().query(
    `${APPOINTMENT_SELECT}
     WHERE a.status = 'confirmed' AND a.doctor_id = $1
     ORDER BY a.date, a.start_time`,
    [doctorId],
  );
  return rows.map(rowToAppointment);
}

export async function findById(id: string): Promise<Appointment | undefined> {
  if (!hasDatabaseUrl()) return fileStore.findById(id);
  await ensureSchema();
  const { rows } = await getPool().query(
    `${APPOINTMENT_SELECT} WHERE a.id = $1`,
    [id],
  );
  return rows[0] ? rowToAppointment(rows[0]) : undefined;
}

export async function findByPatientId(
  patientId: string,
): Promise<Appointment[]> {
  if (!hasDatabaseUrl()) return fileStore.findByPatientId(patientId);
  await ensureSchema();
  const { rows } = await getPool().query(
    `${APPOINTMENT_SELECT}
     WHERE a.patient_id = $1
     ORDER BY a.date DESC, a.start_time DESC`,
    [patientId],
  );
  return rows.map(rowToAppointment);
}

/** @deprecated Prefer findByPatientId after Google session lookup */
export async function findByDniAndBirth(
  dni: string,
  birthDate: string,
): Promise<Appointment[]> {
  if (!hasDatabaseUrl()) {
    const all = await fileStore.listAppointments();
    return all.filter(
      (a) => a.patient?.dni === dni && a.patient?.birthDate === birthDate,
    );
  }
  await ensureSchema();
  const { rows } = await getPool().query(
    `${APPOINTMENT_SELECT}
     WHERE p.dni = $1 AND p.birth_date = $2
     ORDER BY a.date DESC, a.start_time DESC`,
    [dni, birthDate],
  );
  return rows.map(rowToAppointment);
}

export async function isSlotTaken(
  date: string,
  startTime: string,
  doctorId: string = clinic.defaultDoctorId,
  excludeId?: string,
): Promise<boolean> {
  if (!hasDatabaseUrl()) {
    return fileStore.isSlotTaken(date, startTime, doctorId, excludeId);
  }
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT id FROM appointments
     WHERE doctor_id = $1 AND date = $2 AND start_time = $3 AND status = 'confirmed'
       AND ($4::text IS NULL OR id <> $4)
     LIMIT 1`,
    [doctorId, date, startTime, excludeId ?? null],
  );
  return rows.length > 0;
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<Appointment> {
  if (!hasDatabaseUrl()) return fileStore.createAppointment(input);

  await ensureSchema();
  const doctor = await getDoctorById(input.doctorId);
  const duration = input.durationMinutes ?? doctor.slotMinutes;
  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: randomUUID(),
    doctorId: input.doctorId,
    patientId: input.patientId,
    date: input.date,
    startTime: input.startTime,
    durationMinutes: duration,
    endTime: endTimeFor(input.startTime, duration),
    status: "confirmed",
    manageToken: randomBytes(16).toString("hex"),
    googleEventId: null,
    patientGoogleEventId: null,
    calendarMode: "mock",
    createdAt: now,
    updatedAt: now,
  };

  await getPool().query(
    `INSERT INTO appointments (
      id, doctor_id, patient_id, date, start_time, duration_minutes, end_time,
      status, manage_token, google_event_id, patient_google_event_id,
      calendar_mode, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      appointment.id,
      appointment.doctorId,
      appointment.patientId,
      appointment.date,
      appointment.startTime,
      appointment.durationMinutes,
      appointment.endTime,
      appointment.status,
      appointment.manageToken,
      appointment.googleEventId,
      appointment.patientGoogleEventId,
      appointment.calendarMode,
      appointment.createdAt,
      appointment.updatedAt,
    ],
  );

  return (await findById(appointment.id)) ?? appointment;
}

export async function updateAppointment(
  id: string,
  patch: Partial<Appointment>,
): Promise<Appointment | undefined> {
  if (!hasDatabaseUrl()) return fileStore.updateAppointment(id, patch);

  const current = await findById(id);
  if (!current) return undefined;

  const next: Appointment = {
    ...current,
    ...patch,
    patient: current.patient,
    doctor: current.doctor,
    updatedAt: new Date().toISOString(),
  };
  if (patch.startTime || patch.durationMinutes) {
    next.endTime = endTimeFor(next.startTime, next.durationMinutes);
  }

  await getPool().query(
    `UPDATE appointments SET
      doctor_id=$2, patient_id=$3, date=$4, start_time=$5, duration_minutes=$6,
      end_time=$7, status=$8, manage_token=$9, google_event_id=$10,
      patient_google_event_id=$11, calendar_mode=$12, updated_at=$13
     WHERE id=$1`,
    [
      next.id,
      next.doctorId,
      next.patientId,
      next.date,
      next.startTime,
      next.durationMinutes,
      next.endTime,
      next.status,
      next.manageToken,
      next.googleEventId ?? null,
      next.patientGoogleEventId ?? null,
      next.calendarMode,
      next.updatedAt,
    ],
  );

  return findById(id);
}
