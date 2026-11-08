import { randomBytes, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { Appointment, CreateAppointmentInput } from "@/lib/clinic";
import { endTimeFor } from "@/lib/slots";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "appointments.json");

type StoreShape = { appointments: Appointment[] };

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const seed: StoreShape = { appointments: seedAppointments() };
    await fs.writeFile(DATA_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

function seedAppointments(): Appointment[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  // Move to next weekday if weekend
  while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
    tomorrow.setDate(tomorrow.getDate() + 1);
  }
  const date = tomorrow.toISOString().slice(0, 10);
  const now = new Date().toISOString();
  return [
    {
      id: randomUUID(),
      patientName: "María Pérez (ejemplo)",
      dni: "30111222",
      birthDate: "1990-05-12",
      phone: "11 5555-1212",
      email: "maria@example.com",
      date,
      startTime: "10:00",
      endTime: "10:30",
      status: "confirmed",
      manageToken: randomBytes(16).toString("hex"),
      googleEventId: "mock-seed-1",
      calendarMode: "mock",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

async function readStore(): Promise<StoreShape> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(raw) as StoreShape;
}

async function writeStore(store: StoreShape): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function listAppointments(): Promise<Appointment[]> {
  const store = await readStore();
  return store.appointments;
}

export async function listConfirmedAppointments(): Promise<Appointment[]> {
  const all = await listAppointments();
  return all.filter((a) => a.status === "confirmed");
}

export async function findById(id: string): Promise<Appointment | undefined> {
  const all = await listAppointments();
  return all.find((a) => a.id === id);
}

export async function findByDniAndBirth(
  dni: string,
  birthDate: string,
): Promise<Appointment[]> {
  const all = await listAppointments();
  return all
    .filter((a) => a.dni === dni && a.birthDate === birthDate)
    .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const store = await readStore();
  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: randomUUID(),
    patientName: input.patientName.trim(),
    dni: input.dni,
    birthDate: input.birthDate,
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    date: input.date,
    startTime: input.startTime,
    endTime: endTimeFor(input.startTime),
    status: "confirmed",
    manageToken: randomBytes(16).toString("hex"),
    googleEventId: null,
    calendarMode: "mock",
    createdAt: now,
    updatedAt: now,
  };
  store.appointments.push(appointment);
  await writeStore(store);
  return appointment;
}

export async function updateAppointment(
  id: string,
  patch: Partial<Appointment>,
): Promise<Appointment | undefined> {
  const store = await readStore();
  const idx = store.appointments.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  store.appointments[idx] = {
    ...store.appointments[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.appointments[idx];
}

export async function isSlotTaken(
  date: string,
  startTime: string,
  excludeId?: string,
): Promise<boolean> {
  const confirmed = await listConfirmedAppointments();
  return confirmed.some(
    (a) =>
      a.date === date &&
      a.startTime === startTime &&
      a.id !== excludeId,
  );
}
