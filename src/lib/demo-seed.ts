import { randomBytes } from "crypto";
import { addDays, format, getDay, parse } from "date-fns";
import { DEFAULT_DOCTOR_SEED } from "@/lib/clinic";
import { endTimeFor } from "@/lib/slots";
import type {
  Appointment,
  Doctor,
  Patient,
  PatientSex,
} from "@/lib/types";

const OBRAS = [
  "Particular",
  "OSDE",
  "Swiss Medical",
  "Galeno",
  "Medicus",
  "Omint",
  "IOMA",
] as const;

const FIRST_NAMES = [
  "María",
  "Juan",
  "Lucía",
  "Carlos",
  "Valentina",
  "Martín",
  "Sofía",
  "Diego",
  "Camila",
  "Nicolás",
  "Florencia",
  "Pablo",
  "Agustina",
  "Federico",
  "Julieta",
  "Gonzalo",
  "Micaela",
  "Tomás",
  "Paula",
  "Santiago",
  "Romina",
  "Ezequiel",
  "Carolina",
  "Matías",
  "Ailén",
  "Bruno",
  "Denise",
  "Hernán",
  "Jimena",
  "Lucas",
  "Natalia",
  "Rodrigo",
  "Silvina",
  "Facundo",
  "Melina",
] as const;

const LAST_NAMES = [
  "Pérez",
  "González",
  "Rodríguez",
  "Fernández",
  "López",
  "Martínez",
  "García",
  "Sánchez",
  "Romero",
  "Álvarez",
  "Torres",
  "Ruiz",
  "Ramírez",
  "Flores",
  "Acosta",
  "Benítez",
  "Castro",
  "Domínguez",
  "Herrera",
  "Iglesias",
  "Juárez",
  "Kohan",
  "Ledesma",
  "Morales",
  "Núñez",
  "Ortiz",
  "Paz",
  "Quiroga",
  "Ríos",
  "Sosa",
  "Toledo",
  "Urrutia",
  "Vera",
  "Wagner",
  "Yáñez",
] as const;

const SEXES: PatientSex[] = ["female", "male", "other", "undisclosed"];

const SLOT_TIMES = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
] as const;

export const DEMO_PATIENT_COUNT = 35;
export const DEMO_APPOINTMENT_COUNT = 72;

function nowIso() {
  return new Date().toISOString();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function nextWorkday(from: Date): Date {
  const d = new Date(from);
  while (getDay(d) === 0 || getDay(d) === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function isDemoPatientId(id: string): boolean {
  return id.startsWith("seed-patient-");
}

export function isDemoAppointmentId(id: string): boolean {
  return id.startsWith("seed-appt-");
}

export function buildDemoDoctor(now = nowIso()): Doctor {
  return { ...DEFAULT_DOCTOR_SEED, createdAt: now, updatedAt: now };
}

export function buildDemoPatients(
  count: number = DEMO_PATIENT_COUNT,
  now = nowIso(),
): Patient[] {
  const patients: Patient[] = [];
  for (let i = 1; i <= count; i++) {
    const firstName = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i - 1) % LAST_NAMES.length];
    const sex = SEXES[(i - 1) % SEXES.length];
    const birthYear = 1965 + ((i * 7) % 35);
    const birthMonth = pad(((i * 3) % 12) + 1);
    const birthDay = pad(((i * 5) % 28) + 1);
    const dniBase = 20_000_000 + i * 17_341;
    patients.push({
      id: `seed-patient-${pad(i)}`,
      googleSub: `seed-demo-sub-${pad(i)}`,
      email: `${firstName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")}.${lastName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")}${i}@example.com`,
      firstName,
      lastName,
      dni: String(dniBase).slice(0, 8),
      birthDate: `${birthYear}-${birthMonth}-${birthDay}`,
      sex,
      obraSocial: OBRAS[(i - 1) % OBRAS.length],
      phone: `11 ${String(4000 + i).padStart(4, "0")}-${String(1000 + i * 3).padStart(4, "0")}`,
      createdAt: now,
      updatedAt: now,
    });
  }
  return patients;
}

export function buildDemoAppointments(input: {
  doctor: Doctor;
  patients: Patient[];
  count?: number;
  now?: string;
  fromDate?: Date;
}): Appointment[] {
  const {
    doctor,
    patients,
    count = DEMO_APPOINTMENT_COUNT,
    now = nowIso(),
    fromDate = new Date(),
  } = input;
  if (patients.length === 0) return [];

  const appointments: Appointment[] = [];
  let day = nextWorkday(fromDate);
  let slotIndex = 0;
  let patientIndex = 0;

  for (let i = 1; i <= count; i++) {
    if (slotIndex >= SLOT_TIMES.length) {
      slotIndex = 0;
      day = nextWorkday(addDays(day, 1));
    }
    const startTime = SLOT_TIMES[slotIndex];
    slotIndex += 1;
    const patient = patients[patientIndex % patients.length];
    patientIndex += 1;
    const date = format(day, "yyyy-MM-dd");
    const cancelled = i % 11 === 0;
    appointments.push({
      id: `seed-appt-${pad(i)}`,
      doctorId: doctor.id,
      patientId: patient.id,
      date,
      startTime,
      durationMinutes: doctor.slotMinutes,
      endTime: endTimeFor(startTime, doctor.slotMinutes),
      status: cancelled ? "cancelled" : "confirmed",
      manageToken: randomBytes(16).toString("hex"),
      googleEventId: `mock-seed-appt-${pad(i)}`,
      patientGoogleEventId: null,
      calendarMode: "mock",
      createdAt: now,
      updatedAt: now,
      patient,
      doctor: {
        id: doctor.id,
        fullName: doctor.fullName,
        specialty: doctor.specialty,
      },
    });
  }

  return appointments;
}

export function buildVolumeDemoStore(options?: {
  patientCount?: number;
  appointmentCount?: number;
  now?: string;
}): {
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
} {
  const now = options?.now ?? nowIso();
  const doctor = buildDemoDoctor(now);
  const patients = buildDemoPatients(options?.patientCount, now);
  const appointments = buildDemoAppointments({
    doctor,
    patients,
    count: options?.appointmentCount,
    now,
    fromDate: parse(format(new Date(), "yyyy-MM-dd"), "yyyy-MM-dd", new Date()),
  });
  return { doctors: [doctor], patients, appointments };
}
