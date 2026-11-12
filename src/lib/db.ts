import { readFile } from "fs/promises";
import path from "path";
import { Pool } from "pg";
import { DEFAULT_DOCTOR_SEED } from "@/lib/clinic";
import { shouldUseSsl } from "@/lib/db-ssl";
import {
  adminStaffSeed,
  medicoStaffSeedFromEnv,
} from "@/lib/staff-seed";
import type {
  Appointment,
  ClinicStaff,
  Doctor,
  Patient,
  PatientSex,
  StaffRole,
} from "@/lib/types";

declare global {
  // eslint-disable-next-line no-var
  var __odontoPool: Pool | undefined;
}

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Cached probe: URL presente y schema/conexión OK. Si falla → mock store. */
let databaseAvailable: boolean | null = null;
let schemaReady: Promise<void> | null = null;

export async function useDatabase(): Promise<boolean> {
  if (!hasDatabaseUrl()) return false;
  if (databaseAvailable !== null) return databaseAvailable;
  try {
    await ensureSchema();
    await getPool().query("SELECT 1");
    databaseAvailable = true;
  } catch {
    databaseAvailable = false;
    schemaReady = null;
  }
  return databaseAvailable;
}

/** Solo tests: resetear el probe de DB. */
export function resetDatabaseAvailabilityForTests(): void {
  databaseAvailable = null;
  schemaReady = null;
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!global.__odontoPool) {
    const rawUrl = process.env.DATABASE_URL;
    // pg reciente trata sslmode=require como verify-full; manejamos SSL nosotros.
    const connectionString = rawUrl
      ?.replace(/[?&]sslmode=[^&]*/gi, "")
      .replace(/[?&]uselibpqcompat=[^&]*/gi, "")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
    global.__odontoPool = new Pool({
      connectionString,
      ssl: shouldUseSsl(rawUrl) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return global.__odontoPool;
}

type DoctorRow = {
  id: string;
  full_name: string;
  specialty: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  slot_minutes: number;
  work_days: string;
  windows_json: string;
  booking_horizon_days: number;
  pin: string;
  google_calendar_id: string | null;
  google_refresh_token: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type PatientRow = {
  id: string;
  google_sub: string;
  email: string;
  first_name: string;
  last_name: string;
  dni: string | null;
  birth_date: string | null;
  sex: string | null;
  obra_social: string | null;
  phone: string | null;
  google_refresh_token?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ClinicStaffRow = {
  id: string;
  email: string;
  google_sub: string | null;
  role: StaffRole;
  doctor_id: string | null;
  active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

type AppointmentRow = {
  id: string;
  doctor_id: string;
  patient_id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  end_time: string;
  status: "confirmed" | "cancelled";
  manage_token: string;
  google_event_id: string | null;
  patient_google_event_id?: string | null;
  calendar_mode: "google" | "mock";
  created_at: Date | string;
  updated_at: Date | string;
  // optional join
  p_first_name?: string;
  p_last_name?: string;
  p_email?: string;
  p_dni?: string | null;
  p_birth_date?: string | null;
  p_sex?: string | null;
  p_obra_social?: string | null;
  p_phone?: string | null;
  p_google_sub?: string;
  p_created_at?: Date | string;
  p_updated_at?: Date | string;
  d_full_name?: string;
  d_specialty?: string;
};

function iso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

export function rowToDoctor(row: DoctorRow): Doctor {
  return {
    id: row.id,
    fullName: row.full_name,
    specialty: row.specialty,
    email: row.email || undefined,
    phone: row.phone || undefined,
    address: row.address || undefined,
    timezone: row.timezone,
    slotMinutes: row.slot_minutes,
    workDays: JSON.parse(row.work_days) as number[],
    windows: JSON.parse(row.windows_json) as Doctor["windows"],
    bookingHorizonDays: row.booking_horizon_days,
    pin: row.pin,
    googleCalendarId: row.google_calendar_id,
    googleRefreshToken: row.google_refresh_token,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export function rowToPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    googleSub: row.google_sub,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    dni: row.dni,
    birthDate: row.birth_date,
    sex: (row.sex as PatientSex | null) ?? null,
    obraSocial: row.obra_social,
    phone: row.phone,
    googleRefreshToken: row.google_refresh_token ?? null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export function rowToClinicStaff(row: ClinicStaffRow): ClinicStaff {
  return {
    id: row.id,
    email: row.email,
    googleSub: row.google_sub,
    role: row.role,
    doctorId: row.doctor_id,
    active: Boolean(row.active),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

/** Safe patient payload for API responses (no OAuth secrets). */
export function publicPatient(patient: Patient): Patient {
  const { googleRefreshToken: _token, ...rest } = patient;
  return rest;
}

export function rowToAppointment(row: AppointmentRow): Appointment {
  const appointment: Appointment = {
    id: row.id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    date: row.date,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    endTime: row.end_time,
    status: row.status,
    manageToken: row.manage_token,
    googleEventId: row.google_event_id,
    patientGoogleEventId: row.patient_google_event_id ?? null,
    calendarMode: row.calendar_mode,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };

  if (row.p_google_sub && row.p_email && row.p_first_name !== undefined) {
    appointment.patient = {
      id: row.patient_id,
      googleSub: row.p_google_sub,
      email: row.p_email,
      firstName: row.p_first_name,
      lastName: row.p_last_name ?? "",
      dni: row.p_dni,
      birthDate: row.p_birth_date,
      sex: (row.p_sex as PatientSex | null) ?? null,
      obraSocial: row.p_obra_social,
      phone: row.p_phone,
      createdAt: row.p_created_at ? iso(row.p_created_at) : appointment.createdAt,
      updatedAt: row.p_updated_at ? iso(row.p_updated_at) : appointment.updatedAt,
    };
  }

  if (row.d_full_name) {
    appointment.doctor = {
      id: row.doctor_id,
      fullName: row.d_full_name,
      specialty: row.d_specialty ?? "",
    };
  }

  return appointment;
}

export const APPOINTMENT_SELECT = `
  SELECT
    a.*,
    p.google_sub AS p_google_sub,
    p.email AS p_email,
    p.first_name AS p_first_name,
    p.last_name AS p_last_name,
    p.dni AS p_dni,
    p.birth_date AS p_birth_date,
    p.sex AS p_sex,
    p.obra_social AS p_obra_social,
    p.phone AS p_phone,
    p.created_at AS p_created_at,
    p.updated_at AS p_updated_at,
    d.full_name AS d_full_name,
    d.specialty AS d_specialty
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
  JOIN doctors d ON d.id = a.doctor_id
`;

async function seedDoctor(pool: Pool): Promise<void> {
  const d = DEFAULT_DOCTOR_SEED;
  await pool.query(
    `INSERT INTO doctors (
      id, full_name, specialty, email, phone, address, timezone,
      slot_minutes, work_days, windows_json, booking_horizon_days, pin,
      google_calendar_id, google_refresh_token
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      specialty = EXCLUDED.specialty,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address,
      pin = COALESCE(NULLIF(EXCLUDED.pin, ''), doctors.pin),
      updated_at = NOW()`,
    [
      d.id,
      d.fullName,
      d.specialty,
      d.email ?? null,
      d.phone ?? null,
      d.address ?? null,
      d.timezone,
      d.slotMinutes,
      JSON.stringify(d.workDays),
      JSON.stringify(d.windows),
      d.bookingHorizonDays,
      d.pin,
      d.googleCalendarId ?? null,
      d.googleRefreshToken ?? null,
    ],
  );
}

async function upsertStaffSeed(
  pool: Pool,
  staff: ClinicStaff,
): Promise<void> {
  await pool.query(
    `INSERT INTO clinic_staff (
      id, email, google_sub, role, doctor_id, active
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (email) DO UPDATE SET
      role = EXCLUDED.role,
      doctor_id = EXCLUDED.doctor_id,
      active = TRUE,
      updated_at = NOW()`,
    [
      staff.id,
      staff.email,
      staff.googleSub ?? null,
      staff.role,
      staff.doctorId ?? null,
      staff.active,
    ],
  );
}

async function seedClinicStaff(pool: Pool): Promise<void> {
  await upsertStaffSeed(pool, adminStaffSeed());
  const medico = medicoStaffSeedFromEnv();
  if (medico) await upsertStaffSeed(pool, medico);
}

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = getPool();
      const migrationPath = path.join(
        process.cwd(),
        "migrations",
        "002_doctors_patients_appointments.sql",
      );
      try {
        const sql = await readFile(migrationPath, "utf8");
        await pool.query(sql);
      } catch {
        // Fallback inline DDL if file read fails in some runtimes
        await pool.query(`
          CREATE TABLE IF NOT EXISTS doctors (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            specialty TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
            slot_minutes INTEGER NOT NULL DEFAULT 30,
            work_days TEXT NOT NULL,
            windows_json TEXT NOT NULL,
            booking_horizon_days INTEGER NOT NULL DEFAULT 21,
            pin TEXT NOT NULL,
            google_calendar_id TEXT,
            google_refresh_token TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY,
            google_sub TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            first_name TEXT NOT NULL DEFAULT '',
            last_name TEXT NOT NULL DEFAULT '',
            dni TEXT UNIQUE,
            birth_date TEXT,
            sex TEXT,
            obra_social TEXT,
            phone TEXT,
            google_refresh_token TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            doctor_id TEXT NOT NULL REFERENCES doctors (id),
            patient_id TEXT NOT NULL REFERENCES patients (id),
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            end_time TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'confirmed',
            manage_token TEXT NOT NULL,
            google_event_id TEXT,
            patient_google_event_id TEXT,
            calendar_mode TEXT NOT NULL DEFAULT 'mock',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
      }
      try {
        const migratePatientCalendar = await readFile(
          path.join(process.cwd(), "migrations", "003_patient_calendar.sql"),
          "utf8",
        );
        await pool.query(migratePatientCalendar);
      } catch {
        await pool.query(`
          ALTER TABLE patients ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
          ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_google_event_id TEXT;
        `);
      }
      try {
        const migrateStaff = await readFile(
          path.join(process.cwd(), "migrations", "004_clinic_staff.sql"),
          "utf8",
        );
        await pool.query(migrateStaff);
      } catch {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS clinic_staff (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            google_sub TEXT UNIQUE,
            role TEXT NOT NULL CHECK (role IN ('admin', 'medico', 'secretaria')),
            doctor_id TEXT REFERENCES doctors (id),
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT clinic_staff_medico_doctor
              CHECK (
                (role = 'medico' AND doctor_id IS NOT NULL)
                OR (role <> 'medico' AND doctor_id IS NULL)
              )
          );
        `);
      }
      await seedDoctor(pool);
      await seedClinicStaff(pool);
    })();
  }
  await schemaReady;
}
