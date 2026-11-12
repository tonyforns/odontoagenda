import { randomBytes, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_DOCTOR_SEED, clinic } from "@/lib/clinic";
import { buildVolumeDemoStore } from "@/lib/demo-seed";
import { endTimeFor } from "@/lib/slots";
import type {
  Appointment,
  CreateAppointmentInput,
  Doctor,
  Patient,
  PatientProfileInput,
} from "@/lib/types";

function splitGoogleName(name?: string | null): {
  firstName: string;
  lastName: string;
} {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const LEGACY_FILE = path.join(DATA_DIR, "appointments.json");

type StoreShape = {
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
};

function nowIso() {
  return new Date().toISOString();
}

function seedDoctor(): Doctor {
  const now = nowIso();
  return { ...DEFAULT_DOCTOR_SEED, createdAt: now, updatedAt: now };
}

function seedStore(): StoreShape {
  // Volume demo for empty local stores; re-seed with `pnpm seed:volume`.
  return buildVolumeDemoStore();
}

function withJoins(store: StoreShape, appointment: Appointment): Appointment {
  const patient = store.patients.find((p) => p.id === appointment.patientId);
  const doctor = store.doctors.find((d) => d.id === appointment.doctorId);
  return {
    ...appointment,
    patient,
    doctor: doctor
      ? {
          id: doctor.id,
          fullName: doctor.fullName,
          specialty: doctor.specialty,
        }
      : appointment.doctor,
  };
}

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    // Migrate away from legacy file if present
    try {
      await fs.access(LEGACY_FILE);
      await fs.unlink(LEGACY_FILE);
    } catch {
      // ignore
    }
    await fs.writeFile(DATA_FILE, JSON.stringify(seedStore(), null, 2), "utf8");
  }
}

async function readStore(): Promise<StoreShape> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as StoreShape;
  if (!parsed.doctors?.length) {
    parsed.doctors = [seedDoctor()];
  }
  if (!parsed.patients) parsed.patients = [];
  if (!parsed.appointments) parsed.appointments = [];
  return parsed;
}

async function writeStore(store: StoreShape): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function getDoctorById(id: string): Promise<Doctor> {
  const store = await readStore();
  const found = store.doctors.find((d) => d.id === id);
  if (found) return found;
  const doctor = seedDoctor();
  store.doctors.push(doctor);
  await writeStore(store);
  return doctor;
}

export async function getPatientByGoogleSub(
  googleSub: string,
): Promise<Patient | undefined> {
  const store = await readStore();
  return store.patients.find((p) => p.googleSub === googleSub);
}

export async function getPatientById(
  id: string,
): Promise<Patient | undefined> {
  const store = await readStore();
  return store.patients.find((p) => p.id === id);
}

export async function listPatients(): Promise<Patient[]> {
  const store = await readStore();
  return [...store.patients];
}

export async function upsertPatientFromGoogle(input: {
  googleSub: string;
  email: string;
  name?: string | null;
  refreshToken?: string | null;
}): Promise<Patient> {
  const store = await readStore();
  const email = input.email.trim().toLowerCase();
  const split = splitGoogleName(input.name);
  const existing = store.patients.find((p) => p.googleSub === input.googleSub);
  const now = nowIso();

  if (existing) {
    existing.email = email;
    if (!existing.firstName) existing.firstName = split.firstName;
    if (!existing.lastName) existing.lastName = split.lastName;
    if (input.refreshToken) {
      existing.googleRefreshToken = input.refreshToken;
    }
    existing.updatedAt = now;
    await writeStore(store);
    return existing;
  }

  const patient: Patient = {
    id: randomUUID(),
    googleSub: input.googleSub,
    email,
    firstName: split.firstName,
    lastName: split.lastName,
    googleRefreshToken: input.refreshToken ?? null,
    createdAt: now,
    updatedAt: now,
  };
  store.patients.push(patient);
  await writeStore(store);
  return patient;
}

export async function createManualPatient(input: {
  profile: PatientProfileInput;
  email?: string;
}): Promise<Patient> {
  const store = await readStore();
  const now = nowIso();
  const dni = input.profile.dni;
  const existing = store.patients.find((p) => p.dni === dni);
  if (existing) {
    existing.firstName = input.profile.firstName.trim();
    existing.lastName = input.profile.lastName.trim();
    existing.birthDate = input.profile.birthDate;
    existing.sex = input.profile.sex;
    existing.obraSocial = input.profile.obraSocial.trim();
    existing.phone = input.profile.phone.trim();
    if (input.email?.trim()) {
      existing.email = input.email.trim().toLowerCase();
    }
    existing.updatedAt = now;
    await writeStore(store);
    return existing;
  }

  const patient: Patient = {
    id: randomUUID(),
    googleSub: `manual-${randomUUID()}`,
    email:
      input.email?.trim().toLowerCase() ||
      `manual.${dni}@consultorio.local`,
    firstName: input.profile.firstName.trim(),
    lastName: input.profile.lastName.trim(),
    dni,
    birthDate: input.profile.birthDate,
    sex: input.profile.sex,
    obraSocial: input.profile.obraSocial.trim(),
    phone: input.profile.phone.trim(),
    createdAt: now,
    updatedAt: now,
  };
  store.patients.push(patient);
  await writeStore(store);
  return patient;
}

export async function updatePatientProfile(
  googleSub: string,
  profile: PatientProfileInput,
): Promise<Patient | undefined> {
  const store = await readStore();
  const patient = store.patients.find((p) => p.googleSub === googleSub);
  if (!patient) return undefined;
  patient.firstName = profile.firstName.trim();
  patient.lastName = profile.lastName.trim();
  patient.dni = profile.dni;
  patient.birthDate = profile.birthDate;
  patient.sex = profile.sex;
  patient.obraSocial = profile.obraSocial.trim();
  patient.phone = profile.phone.trim();
  patient.updatedAt = nowIso();
  await writeStore(store);
  return patient;
}

export async function listAppointments(): Promise<Appointment[]> {
  const store = await readStore();
  return store.appointments
    .map((a) => withJoins(store, a))
    .sort((a, b) =>
      `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`),
    );
}

export async function listConfirmedAppointments(
  doctorId: string = clinic.defaultDoctorId,
): Promise<Appointment[]> {
  const all = await listAppointments();
  return all.filter(
    (a) => a.status === "confirmed" && a.doctorId === doctorId,
  );
}

export async function findById(id: string): Promise<Appointment | undefined> {
  const store = await readStore();
  const found = store.appointments.find((a) => a.id === id);
  return found ? withJoins(store, found) : undefined;
}

export async function findByPatientId(
  patientId: string,
): Promise<Appointment[]> {
  const all = await listAppointments();
  return all.filter((a) => a.patientId === patientId);
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const store = await readStore();
  const doctor =
    store.doctors.find((d) => d.id === input.doctorId) ?? seedDoctor();
  const duration = input.durationMinutes ?? doctor.slotMinutes;
  const now = nowIso();
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
  store.appointments.push(appointment);
  await writeStore(store);
  return withJoins(store, appointment);
}

export async function updateAppointment(
  id: string,
  patch: Partial<Appointment>,
): Promise<Appointment | undefined> {
  const store = await readStore();
  const idx = store.appointments.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  const current = store.appointments[idx];
  const next: Appointment = {
    ...current,
    ...patch,
    patient: undefined,
    doctor: undefined,
    updatedAt: nowIso(),
  };
  if (patch.startTime || patch.durationMinutes) {
    next.endTime = endTimeFor(
      next.startTime,
      next.durationMinutes,
    );
  }
  store.appointments[idx] = next;
  await writeStore(store);
  return withJoins(store, next);
}

export async function isSlotTaken(
  date: string,
  startTime: string,
  doctorId: string = clinic.defaultDoctorId,
  excludeId?: string,
): Promise<boolean> {
  const confirmed = await listConfirmedAppointments(doctorId);
  return confirmed.some(
    (a) =>
      a.date === date &&
      a.startTime === startTime &&
      a.id !== excludeId,
  );
}
