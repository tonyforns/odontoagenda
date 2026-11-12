import { describe, expect, it } from "vitest";
import {
  DEMO_APPOINTMENT_COUNT,
  DEMO_PATIENT_COUNT,
  buildDemoPatients,
  buildVolumeDemoStore,
  isDemoAppointmentId,
  isDemoPatientId,
} from "@/lib/demo-seed";

describe("demo-seed", () => {
  it("builds the expected patient volume with stable ids", () => {
    const patients = buildDemoPatients();
    expect(patients).toHaveLength(DEMO_PATIENT_COUNT);
    expect(patients[0]?.id).toBe("seed-patient-01");
    expect(isDemoPatientId(patients[0]!.id)).toBe(true);
  });

  it("builds a full volume store with appointments", () => {
    const store = buildVolumeDemoStore();
    expect(store.doctors).toHaveLength(1);
    expect(store.patients).toHaveLength(DEMO_PATIENT_COUNT);
    expect(store.appointments).toHaveLength(DEMO_APPOINTMENT_COUNT);
    expect(isDemoAppointmentId(store.appointments[0]!.id)).toBe(true);
    expect(
      store.appointments.every((a) =>
        store.patients.some((p) => p.id === a.patientId),
      ),
    ).toBe(true);
  });
});
