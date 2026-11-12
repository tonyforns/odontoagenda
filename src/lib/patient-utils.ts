import type { Patient, PatientSex } from "@/lib/types";

export function splitGoogleName(name?: string | null): {
  firstName: string;
  lastName: string;
} {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function isProfileComplete(patient: Patient | null | undefined): boolean {
  if (!patient) return false;
  return Boolean(
    patient.firstName.trim() &&
      patient.lastName.trim() &&
      patient.dni &&
      /^\d{7,8}$/.test(patient.dni) &&
      patient.birthDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(patient.birthDate) &&
      patient.sex &&
      patient.obraSocial?.trim() &&
      patient.phone &&
      patient.phone.trim().length >= 8,
  );
}

export function patientDisplayName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`.trim() || patient.email;
}

export const SEX_LABELS: Record<PatientSex, string> = {
  female: "Femenino",
  male: "Masculino",
  other: "Otro",
  undisclosed: "Prefiero no decir",
};
