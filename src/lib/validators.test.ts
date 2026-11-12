import { describe, expect, it } from "vitest";
import {
  adminAssignSchema,
  bookingSchema,
  normalizeDni,
  patientProfileSchema,
} from "@/lib/validators";

describe("normalizeDni", () => {
  it("strips non-digits", () => {
    expect(normalizeDni("30.111.222")).toBe("30111222");
  });
});

describe("patientProfileSchema", () => {
  it("accepts a complete profile", () => {
    const result = patientProfileSchema.safeParse({
      firstName: "María",
      lastName: "Pérez",
      dni: "30.111.222",
      birthDate: "1990-05-12",
      sex: "female",
      obraSocial: "Particular",
      phone: "11 5555-1212",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dni).toBe("30111222");
  });

  it("rejects short DNI", () => {
    const result = patientProfileSchema.safeParse({
      firstName: "Ana",
      lastName: "Lopez",
      dni: "123",
      birthDate: "1990-05-12",
      sex: "female",
      obraSocial: "OSDE",
      phone: "1155551212",
    });
    expect(result.success).toBe(false);
  });
});

describe("bookingSchema", () => {
  it("accepts date and startTime", () => {
    const result = bookingSchema.safeParse({
      date: "2026-03-12",
      startTime: "10:00",
    });
    expect(result.success).toBe(true);
  });
});

describe("adminAssignSchema", () => {
  it("accepts assignment to an existing patient", () => {
    const result = adminAssignSchema.safeParse({
      date: "2026-03-12",
      startTime: "10:00",
      patientId: "pat-1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts creating a new patient ficha for the slot", () => {
    const result = adminAssignSchema.safeParse({
      date: "2026-03-12",
      startTime: "10:00",
      patient: {
        firstName: "Ana",
        lastName: "López",
        dni: "30111222",
        birthDate: "1990-05-12",
        sex: "female",
        obraSocial: "OSDE",
        phone: "1155551212",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects when neither patientId nor patient is provided", () => {
    const result = adminAssignSchema.safeParse({
      date: "2026-03-12",
      startTime: "10:00",
    });
    expect(result.success).toBe(false);
  });
});
