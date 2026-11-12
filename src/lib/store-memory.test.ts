import { afterEach, describe, expect, it } from "vitest";
import {
  DEMO_APPOINTMENT_COUNT,
  DEMO_PATIENT_COUNT,
} from "@/lib/demo-seed";
import {
  listAppointments,
  listPatients,
  preferMemoryStore,
  resetMemoryStoreForTests,
} from "@/lib/store";

describe("memory mock store", () => {
  afterEach(() => {
    delete process.env.ODONTO_MEMORY_STORE;
    delete process.env.VERCEL;
    resetMemoryStoreForTests();
  });

  it("prefers memory on Vercel and when ODONTO_MEMORY_STORE=1", () => {
    expect(preferMemoryStore()).toBe(false);
    process.env.VERCEL = "1";
    expect(preferMemoryStore()).toBe(true);
    delete process.env.VERCEL;
    process.env.ODONTO_MEMORY_STORE = "1";
    expect(preferMemoryStore()).toBe(true);
  });

  it("seeds volume demo data in memory mode", async () => {
    process.env.ODONTO_MEMORY_STORE = "1";
    resetMemoryStoreForTests();
    const patients = await listPatients();
    const appointments = await listAppointments();
    expect(patients).toHaveLength(DEMO_PATIENT_COUNT);
    expect(appointments).toHaveLength(DEMO_APPOINTMENT_COUNT);
  });
});
