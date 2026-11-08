import { randomBytes, randomUUID } from "crypto";
import type { Appointment, CreateAppointmentInput } from "@/lib/clinic";
import { endTimeFor } from "@/lib/slots";
import {
  ensureSchema,
  getPool,
  hasDatabaseUrl,
  rowToAppointment,
} from "@/lib/db";
import * as fileStore from "@/lib/store";

export async function listAppointments(): Promise<Appointment[]> {
  if (!hasDatabaseUrl()) return fileStore.listAppointments();
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT * FROM appointments ORDER BY date DESC, start_time DESC`,
  );
  return rows.map(rowToAppointment);
}

export async function listConfirmedAppointments(): Promise<Appointment[]> {
  if (!hasDatabaseUrl()) return fileStore.listConfirmedAppointments();
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT * FROM appointments WHERE status = 'confirmed' ORDER BY date, start_time`,
  );
  return rows.map(rowToAppointment);
}

export async function findById(id: string): Promise<Appointment | undefined> {
  if (!hasDatabaseUrl()) return fileStore.findById(id);
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT * FROM appointments WHERE id = $1`,
    [id],
  );
  return rows[0] ? rowToAppointment(rows[0]) : undefined;
}

export async function findByDniAndBirth(
  dni: string,
  birthDate: string,
): Promise<Appointment[]> {
  if (!hasDatabaseUrl()) return fileStore.findByDniAndBirth(dni, birthDate);
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT * FROM appointments WHERE dni = $1 AND birth_date = $2
     ORDER BY date DESC, start_time DESC`,
    [dni, birthDate],
  );
  return rows.map(rowToAppointment);
}

export async function isSlotTaken(
  date: string,
  startTime: string,
  excludeId?: string,
): Promise<boolean> {
  if (!hasDatabaseUrl()) {
    return fileStore.isSlotTaken(date, startTime, excludeId);
  }
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT id FROM appointments
     WHERE date = $1 AND start_time = $2 AND status = 'confirmed'
       AND ($3::text IS NULL OR id <> $3)
     LIMIT 1`,
    [date, startTime, excludeId ?? null],
  );
  return rows.length > 0;
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<Appointment> {
  if (!hasDatabaseUrl()) return fileStore.createAppointment(input);

  await ensureSchema();
  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: randomUUID(),
    patientName: input.patientName.trim(),
    dni: input.dni,
    birthDate: input.birthDate,
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    date: input.date,
    startTime: input.startTime,
    endTime: endTimeFor(input.startTime),
    status: "confirmed",
    manageToken: randomBytes(16).toString("hex"),
    googleEventId: null,
    calendarMode: "mock",
    createdAt: now,
    updatedAt: now,
  };

  await getPool().query(
    `INSERT INTO appointments (
      id, patient_name, dni, birth_date, phone, email, date, start_time, end_time,
      status, manage_token, google_event_id, calendar_mode, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      appointment.id,
      appointment.patientName,
      appointment.dni,
      appointment.birthDate,
      appointment.phone,
      appointment.email ?? null,
      appointment.date,
      appointment.startTime,
      appointment.endTime,
      appointment.status,
      appointment.manageToken,
      appointment.googleEventId,
      appointment.calendarMode,
      appointment.createdAt,
      appointment.updatedAt,
    ],
  );

  return appointment;
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
    updatedAt: new Date().toISOString(),
  };

  await getPool().query(
    `UPDATE appointments SET
      patient_name=$2, dni=$3, birth_date=$4, phone=$5, email=$6,
      date=$7, start_time=$8, end_time=$9, status=$10, manage_token=$11,
      google_event_id=$12, calendar_mode=$13, updated_at=$14
     WHERE id=$1`,
    [
      next.id,
      next.patientName,
      next.dni,
      next.birthDate,
      next.phone,
      next.email ?? null,
      next.date,
      next.startTime,
      next.endTime,
      next.status,
      next.manageToken,
      next.googleEventId ?? null,
      next.calendarMode,
      next.updatedAt,
    ],
  );

  return next;
}
