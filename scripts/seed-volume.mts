import { promises as fs } from "node:fs";
import path from "node:path";
import pg from "pg";
import {
  buildVolumeDemoStore,
  isDemoAppointmentId,
  isDemoPatientId,
} from "../src/lib/demo-seed";
import { shouldUseSsl } from "../src/lib/db-ssl";
import { DEFAULT_DOCTOR_SEED } from "../src/lib/clinic";

const DATA_FILE = path.join(process.cwd(), ".data", "store.json");

type StoreShape = {
  doctors: unknown[];
  patients: Array<{ id: string; googleSub?: string }>;
  appointments: Array<{ id: string; patientId?: string }>;
};

async function loadDatabaseUrl(): Promise<string | null> {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
    const line = raw
      .split(/\r?\n/)
      .find((l) => l.startsWith("DATABASE_URL="));
    if (!line) return null;
    return line.slice("DATABASE_URL=".length).trim() || null;
  } catch {
    return null;
  }
}

async function seedJsonStore() {
  const demo = buildVolumeDemoStore();
  let existing: StoreShape | null = null;
  try {
    existing = JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as StoreShape;
  } catch {
    existing = null;
  }

  const keptPatients =
    existing?.patients.filter((p) => !isDemoPatientId(p.id)) ?? [];
  const keptAppointments =
    existing?.appointments.filter((a) => !isDemoAppointmentId(a.id)) ?? [];

  const store = {
    doctors: existing?.doctors?.length ? existing.doctors : demo.doctors,
    patients: [...keptPatients, ...demo.patients],
    appointments: [...keptAppointments, ...demo.appointments],
  };

  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");

  console.log(
    `Seed JSON OK: ${store.patients.length} pacientes, ${store.appointments.length} turnos → ${DATA_FILE}`,
  );
}

async function seedPostgres(rawUrl: string) {
  const connectionString = rawUrl
    .replace(/[?&]sslmode=[^&]*/gi, "")
    .replace(/[?&]uselibpqcompat=[^&]*/gi, "")
    .replace(/\?&/, "?")
    .replace(/[?&]$/, "");
  const pool = new pg.Pool({
    connectionString,
    ssl: shouldUseSsl(rawUrl) ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const demo = buildVolumeDemoStore();
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

    await pool.query(
      `DELETE FROM appointments WHERE id LIKE 'seed-appt-%'`,
    );
    await pool.query(
      `DELETE FROM patients WHERE id LIKE 'seed-patient-%'`,
    );

    for (const p of demo.patients) {
      await pool.query(
        `INSERT INTO patients (
          id, google_sub, email, first_name, last_name, dni, birth_date,
          sex, obra_social, phone, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          dni = EXCLUDED.dni,
          birth_date = EXCLUDED.birth_date,
          sex = EXCLUDED.sex,
          obra_social = EXCLUDED.obra_social,
          phone = EXCLUDED.phone,
          updated_at = NOW()`,
        [
          p.id,
          p.googleSub,
          p.email,
          p.firstName,
          p.lastName,
          p.dni ?? null,
          p.birthDate ?? null,
          p.sex ?? null,
          p.obraSocial ?? null,
          p.phone ?? null,
          p.createdAt,
          p.updatedAt,
        ],
      );
    }

    for (const a of demo.appointments) {
      await pool.query(
        `INSERT INTO appointments (
          id, doctor_id, patient_id, date, start_time, duration_minutes,
          end_time, status, manage_token, google_event_id,
          patient_google_event_id, calendar_mode, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          date = EXCLUDED.date,
          start_time = EXCLUDED.start_time,
          updated_at = NOW()`,
        [
          a.id,
          a.doctorId,
          a.patientId,
          a.date,
          a.startTime,
          a.durationMinutes,
          a.endTime,
          a.status,
          a.manageToken,
          a.googleEventId ?? null,
          a.patientGoogleEventId ?? null,
          a.calendarMode,
          a.createdAt,
          a.updatedAt,
        ],
      );
    }

    console.log(
      `Seed DB OK: ${demo.patients.length} pacientes demo, ${demo.appointments.length} turnos demo`,
    );
  } finally {
    await pool.end();
  }
}

async function main() {
  const databaseUrl = await loadDatabaseUrl();
  if (databaseUrl) {
    await seedPostgres(databaseUrl);
    return;
  }
  await seedJsonStore();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
