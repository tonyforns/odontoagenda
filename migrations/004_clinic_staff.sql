-- Staff del consultorio (roles). Paciente = sin fila aquí.

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

CREATE INDEX IF NOT EXISTS idx_clinic_staff_email ON clinic_staff (email);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_google_sub ON clinic_staff (google_sub);

-- Admin seed: iaforns@gmail.com
INSERT INTO clinic_staff (id, email, role, doctor_id, active)
VALUES (
  'staff_admin_iaforns',
  'iaforns@gmail.com',
  'admin',
  NULL,
  TRUE
)
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  active = TRUE,
  updated_at = NOW();
