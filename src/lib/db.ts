import { Pool } from "pg";
import type { Appointment } from "@/lib/clinic";

declare global {
  // eslint-disable-next-line no-var
  var __odontoPool: Pool | undefined;
}

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!global.__odontoPool) {
    global.__odontoPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return global.__odontoPool;
}

type Row = {
  id: string;
  patient_name: string;
  dni: string;
  birth_date: string;
  phone: string;
  email: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled";
  manage_token: string;
  google_event_id: string | null;
  calendar_mode: "google" | "mock";
  created_at: Date | string;
  updated_at: Date | string;
};

export function rowToAppointment(row: Row): Appointment {
  return {
    id: row.id,
    patientName: row.patient_name,
    dni: row.dni,
    birthDate: row.birth_date,
    phone: row.phone,
    email: row.email || undefined,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    manageToken: row.manage_token,
    googleEventId: row.google_event_id,
    calendarMode: row.calendar_mode,
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : row.created_at.toISOString(),
    updatedAt:
      typeof row.updated_at === "string"
        ? row.updated_at
        : row.updated_at.toISOString(),
  };
}

let schemaReady: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS appointments (
          id TEXT PRIMARY KEY,
          patient_name TEXT NOT NULL,
          dni TEXT NOT NULL,
          birth_date TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'confirmed',
          manage_token TEXT NOT NULL,
          google_event_id TEXT,
          calendar_mode TEXT NOT NULL DEFAULT 'mock',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_appointments_dni_birth ON appointments (dni, birth_date);
        CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments (date, status);
      `);
    })();
  }
  await schemaReady;
}
