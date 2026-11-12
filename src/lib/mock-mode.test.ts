import { afterEach, describe, expect, it } from "vitest";
import { isProfileComplete } from "@/lib/patient-utils";
import {
  isMockBookingMode,
  withMockCompleteProfile,
} from "@/lib/mock-mode";
import type { Patient } from "@/lib/types";

function basePatient(partial: Partial<Patient> = {}): Patient {
  const now = new Date().toISOString();
  return {
    id: "p1",
    googleSub: "google-sub-abc",
    email: "ana.lopez@gmail.com",
    firstName: "Ana",
    lastName: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe("mock-mode", () => {
  afterEach(() => {
    delete process.env.ODONTO_MOCK_BOOKING;
    delete process.env.ODONTO_MEMORY_STORE;
    delete process.env.VERCEL;
    delete process.env.DATABASE_URL;
  });

  it("enables mock booking without DATABASE_URL", () => {
    delete process.env.DATABASE_URL;
    expect(isMockBookingMode()).toBe(true);
  });

  it("completes an incomplete profile with stable demo fields", () => {
    process.env.ODONTO_MOCK_BOOKING = "1";
    const a = withMockCompleteProfile(basePatient());
    const b = withMockCompleteProfile(basePatient());
    expect(isProfileComplete(a)).toBe(true);
    expect(a.dni).toBe(b.dni);
    expect(a.obraSocial).toBe("Particular");
  });

  it("does not alter complete profiles", () => {
    process.env.ODONTO_MOCK_BOOKING = "1";
    const complete = basePatient({
      lastName: "López",
      dni: "30111222",
      birthDate: "1990-05-01",
      sex: "female",
      obraSocial: "OSDE",
      phone: "1155556677",
    });
    expect(withMockCompleteProfile(complete)).toEqual(complete);
  });
});
