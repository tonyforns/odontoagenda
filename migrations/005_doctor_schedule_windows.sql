-- Horarios de atención por día (fuente de verdad; reemplaza el uso plano de windows_json).

CREATE TABLE IF NOT EXISTS doctor_schedule_windows (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  CONSTRAINT doctor_schedule_windows_range CHECK (start_time < end_time),
  CONSTRAINT doctor_schedule_windows_unique
    UNIQUE (doctor_id, weekday, start_time)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedule_doctor_weekday
  ON doctor_schedule_windows (doctor_id, weekday);

-- Seed lun–vie 09–12 y 15–18 para el doctor por defecto (si aún no hay filas).
INSERT INTO doctor_schedule_windows (id, doctor_id, weekday, start_time, end_time)
SELECT v.id, v.doctor_id, v.weekday, v.start_time, v.end_time
FROM (
  VALUES
    ('dsw_rafael_1_0900', 'doc_rafael_lovera', 1, '09:00', '12:00'),
    ('dsw_rafael_1_1500', 'doc_rafael_lovera', 1, '15:00', '18:00'),
    ('dsw_rafael_2_0900', 'doc_rafael_lovera', 2, '09:00', '12:00'),
    ('dsw_rafael_2_1500', 'doc_rafael_lovera', 2, '15:00', '18:00'),
    ('dsw_rafael_3_0900', 'doc_rafael_lovera', 3, '09:00', '12:00'),
    ('dsw_rafael_3_1500', 'doc_rafael_lovera', 3, '15:00', '18:00'),
    ('dsw_rafael_4_0900', 'doc_rafael_lovera', 4, '09:00', '12:00'),
    ('dsw_rafael_4_1500', 'doc_rafael_lovera', 4, '15:00', '18:00'),
    ('dsw_rafael_5_0900', 'doc_rafael_lovera', 5, '09:00', '12:00'),
    ('dsw_rafael_5_1500', 'doc_rafael_lovera', 5, '15:00', '18:00')
) AS v(id, doctor_id, weekday, start_time, end_time)
WHERE EXISTS (SELECT 1 FROM doctors d WHERE d.id = 'doc_rafael_lovera')
  AND NOT EXISTS (
    SELECT 1 FROM doctor_schedule_windows w WHERE w.doctor_id = 'doc_rafael_lovera'
  );
