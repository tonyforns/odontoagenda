-- Core domain: doctors, patients, appointments
-- Safe for fresh DBs. If an old denormalized `appointments` exists, drop it first in a controlled migrate.

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Replace legacy denormalized appointments if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'appointments'
      AND column_name = 'patient_name'
  ) THEN
    DROP TABLE appointments;
  END IF;
END $$;

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
  calendar_mode TEXT NOT NULL DEFAULT 'mock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_status
  ON appointments (doctor_id, date, status);

CREATE INDEX IF NOT EXISTS idx_appointments_patient
  ON appointments (patient_id);

CREATE INDEX IF NOT EXISTS idx_patients_google_sub ON patients (google_sub);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients (email);

-- Seed doctor: Rafael Lovera
INSERT INTO doctors (
  id,
  full_name,
  specialty,
  email,
  phone,
  address,
  timezone,
  slot_minutes,
  work_days,
  windows_json,
  booking_horizon_days,
  pin
) VALUES (
  'doc_rafael_lovera',
  'Dr. Rafael Lovera',
  'Odontología general',
  NULL,
  '+54 11 4567-8900',
  'Av. Santa Fe 2840, CABA',
  'America/Argentina/Buenos_Aires',
  30,
  '[1,2,3,4,5]',
  '[{"start":"09:00","end":"12:00"},{"start":"15:00","end":"18:00"}]',
  21,
  '1752'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  specialty = EXCLUDED.specialty,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  pin = EXCLUDED.pin,
  updated_at = NOW();
