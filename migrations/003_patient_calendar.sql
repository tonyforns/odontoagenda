-- Patient Google Calendar tokens + event ids on appointments

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS patient_google_event_id TEXT;
