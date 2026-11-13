import { randomBytes, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_DOCTOR_SEED, clinic } from "@/lib/clinic";
import { withDoctorSchedule } from "@/lib/schedule";
import { endTimeFor } from "@/lib/slots";
import {
  adminStaffSeed,
  medicoStaffSeedFromEnv,
} from "@/lib/staff-seed";
import type {
  Appointment,
  ClinicStaff,
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
  clinicStaff: ClinicStaff[];
};

function nowIso() {
  return new Date().toISOString();
}

function seedDoctor(): Doctor {
  const now = nowIso();
  return { ...DEFAULT_DOCTOR_SEED, createdAt: now, updatedAt: now };
}

function seedClinicStaff(): ClinicStaff[] {
  const staff = [adminStaffSeed()];
  const medico = medicoStaffSeedFromEnv();
  if (medico) staff.push(medico);
  return staff;
}

/** Fallback local sin DATABASE_URL. Para demos densas: `pnpm seed:volume`. */
function seedStore(): StoreShape {
  return {
    doctors: [seedDoctor()],
    patients: [],
    appointments: [],
    clinicStaff: seedClinicStaff(),
  };
}

function ensureStaffSeeded(store: StoreShape): void {
  if (!store.clinicStaff) store.clinicStaff = [];
  const admin = adminStaffSeed();
  const existingAdmin = store.clinicStaff.find(
    (s) => s.email === admin.email,
  );
  if (!existingAdmin) {
    store.clinicStaff.push(admin);
  } else {
    // Seed canónico: siempre admin activo.
    existingAdmin.role = "admin";
    existingAdmin.active = true;
    existingAdmin.doctorId = null;
  }
  const medico = medicoStaffSeedFromEnv();
  if (
    medico &&
    !store.clinicStaff.some((s) => s.email === medico.email)
  ) {
    store.clinicStaff.push(medico);
  }
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
  if (!parsed.clinicStaff) parsed.clinicStaff = [];
  ensureStaffSeeded(parsed);
  return parsed;
}

async function writeStore(store: StoreShape): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function getDoctorById(id: string): Promise<Doctor> {
  const store = await readStore();
  const found = store.doctors.find((d) => d.id === id);
  if (found) return withDoctorSchedule(found);
  const doctor = seedDoctor();
  store.doctors.push(doctor);
  await writeStore(store);
  return withDoctorSchedule(doctor);
}

export async function replaceDoctorSchedule(
  doctorId: string,
  schedule: Doctor["schedule"],
  legacy: { workDays: number[]; windows: Doctor["windows"] },
): Promise<Doctor["schedule"]> {
  const store = await readStore();
  const doctor = store.doctors.find((d) => d.id === doctorId);
  if (!doctor) {
    throw new Error("Doctor no encontrado.");
  }
  doctor.schedule = schedule;
  doctor.workDays = legacy.workDays;
  doctor.windows = legacy.windows;
  doctor.updatedAt = nowIso();
  await writeStore(store);
  return withDoctorSchedule(doctor).schedule;
}

export async function findActiveStaff(opts: {
  email?: string | null;
  googleSub?: string | null;
}): Promise<ClinicStaff | null> {
  const store = await readStore();
  ensureStaffSeeded(store);
  if (opts.googleSub) {
    const bySub = store.clinicStaff.find(
      (s) => s.active && s.googleSub === opts.googleSub,
    );
    if (bySub) return bySub;
  }
  if (opts.email) {
    const email = opts.email.trim().toLowerCase();
    const byEmail = store.clinicStaff.find(
      (s) => s.active && s.email === email,
    );
    if (byEmail) return byEmail;
  }
  return null;
}

export async function linkStaffGoogleSub(input: {
  email: string;
  googleSub: string;
}): Promise<ClinicStaff | null> {
  const store = await readStore();
  ensureStaffSeeded(store);
  const email = input.email.trim().toLowerCase();
  const staff = store.clinicStaff.find((s) => s.active && s.email === email);
  if (!staff) return null;
  staff.googleSub = input.googleSub;
  staff.updatedAt = nowIso();
  await writeStore(store);
  return staff;
}

export async function listStaff(): Promise<ClinicStaff[]> {
  const store = await readStore();
  ensureStaffSeeded(store);
  await writeStore(store);
  return [...store.clinicStaff].sort((a, b) => a.email.localeCompare(b.email));
}

export async function upsertStaffMember(input: {
  email: string;
  role: ClinicStaff["role"];
  doctorId: string | null;
}): Promise<ClinicStaff> {
  const store = await readStore();
  ensureStaffSeeded(store);
  const email = input.email.trim().toLowerCase();
  const existing = store.clinicStaff.find((s) => s.email === email);
  const now = nowIso();
  if (existing) {
    existing.role = input.role;
    existing.doctorId = input.doctorId;
    existing.active = true;
    existing.updatedAt = now;
    await writeStore(store);
    return existing;
  }
  const staff: ClinicStaff = {
    id: randomUUID(),
    email,
    googleSub: null,
    role: input.role,
    doctorId: input.doctorId,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  store.clinicStaff.push(staff);
  await writeStore(store);
  return staff;
}

export async function getStaffById(id: string): Promise<ClinicStaff | null> {
  const store = await readStore();
  ensureStaffSeeded(store);
  return store.clinicStaff.find((s) => s.id === id) ?? null;
}

export async function patchStaffMember(
  id: string,
  patch: {
    role: ClinicStaff["role"];
    doctorId: string | null;
    active: boolean;
  },
): Promise<ClinicStaff | null> {
  const store = await readStore();
  ensureStaffSeeded(store);
  const staff = store.clinicStaff.find((s) => s.id === id);
  if (!staff) return null;
  staff.role = patch.role;
  staff.doctorId = patch.doctorId;
  staff.active = patch.active;
  staff.updatedAt = nowIso();
  await writeStore(store);
  return staff;
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
  applyPatientProfile(patient, profile);
  await writeStore(store);
  return patient;
}

function applyPatientProfile(
  patient: Patient,
  profile: PatientProfileInput,
): void {
  patient.firstName = profile.firstName.trim();
  patient.lastName = profile.lastName.trim();
  patient.dni = profile.dni;
  patient.birthDate = profile.birthDate;
  patient.sex = profile.sex;
  patient.obraSocial = profile.obraSocial.trim();
  patient.phone = profile.phone.trim();
  patient.updatedAt = nowIso();
}

/** Actualiza ficha por id. No modifica email. */
export async function updatePatientById(
  id: string,
  profile: PatientProfileInput,
): Promise<Patient | undefined> {
  const store = await readStore();
  const patient = store.patients.find((p) => p.id === id);
  if (!patient) return undefined;
  const dniTaken = store.patients.some(
    (p) => p.id !== id && p.dni === profile.dni,
  );
  if (dniTaken) {
    throw new Error("DNI_TAKEN");
  }
  applyPatientProfile(patient, profile);
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
