import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildVolumeDemoStore,
  isDemoAppointmentId,
  isDemoPatientId,
} from "../src/lib/demo-seed";

const DATA_FILE = path.join(process.cwd(), ".data", "store.json");

type StoreShape = {
  doctors: unknown[];
  patients: Array<{ id: string; googleSub?: string }>;
  appointments: Array<{ id: string; patientId?: string }>;
};

async function main() {
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
    `Seed OK: ${store.patients.length} pacientes, ${store.appointments.length} turnos → ${DATA_FILE}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
