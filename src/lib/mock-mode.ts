import { createHash } from "crypto";
import { hasDatabaseUrl } from "@/lib/db";
import { isProfileComplete } from "@/lib/patient-utils";
import type { Patient, PatientSex } from "@/lib/types";

/** Vercel (u ODONTO_MEMORY_STORE): store en memoria con seed volume. */
export function preferMemoryStore(): boolean {
  const flag = process.env.ODONTO_MEMORY_STORE;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return process.env.VERCEL === "1";
}

/**
 * Modo demo de reservas: sin Postgres (o Vercel memory store).
 * El login Gmail sigue siendo real; ficha y Calendar se mockean.
 */
export function isMockBookingMode(): boolean {
  const flag = process.env.ODONTO_MOCK_BOOKING;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return preferMemoryStore() || !hasDatabaseUrl();
}

/** Completa ficha demo estable a partir del Google sub (para poder sacar turno ya). */
export function withMockCompleteProfile(patient: Patient): Patient {
  if (!isMockBookingMode() || isProfileComplete(patient)) return patient;

  const hash = createHash("sha256").update(patient.googleSub).digest("hex");
  const dniNum = (parseInt(hash.slice(0, 8), 16) % 90_000_000) + 10_000_000;
  const dni = String(dniNum).slice(0, 8);
  const year = 1975 + (parseInt(hash.slice(8, 10), 16) % 30);
  const month = String((parseInt(hash.slice(10, 12), 16) % 12) + 1).padStart(
    2,
    "0",
  );
  const day = String((parseInt(hash.slice(12, 14), 16) % 28) + 1).padStart(
    2,
    "0",
  );
  const sexes: PatientSex[] = ["female", "male", "other", "undisclosed"];
  const sex = sexes[parseInt(hash.slice(14, 16), 16) % sexes.length]!;

  const firstName =
    patient.firstName.trim() ||
    patient.email.split("@")[0]?.split(".")[0] ||
    "Paciente";
  const lastName = patient.lastName.trim() || "Demo";

  return {
    ...patient,
    firstName: firstName.slice(0, 60),
    lastName: lastName.slice(0, 60),
    dni,
    birthDate: `${year}-${month}-${day}`,
    sex,
    obraSocial: patient.obraSocial?.trim() || "Particular",
    phone: patient.phone?.trim() || "1112345678",
    updatedAt: new Date().toISOString(),
  };
}
