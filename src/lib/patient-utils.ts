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

export function sortPatientsByName(patients: Patient[]): Patient[] {
  return [...patients].sort((a, b) =>
    patientDisplayName(a).localeCompare(patientDisplayName(b), "es", {
      sensitivity: "base",
    }),
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Free-text filter: name, DNI, phone, email, obra social. */
export function filterPatients(
  patients: Patient[],
  query: string,
  obraSocial?: string,
): Patient[] {
  const q = normalizeSearch(query);
  const digits = query.replace(/\D/g, "");
  const obra = obraSocial?.trim() ?? "";

  return patients.filter((patient) => {
    if (obra && (patient.obraSocial ?? "") !== obra) return false;
    if (!q && !digits) return true;

    const haystack = normalizeSearch(
      [
        patientDisplayName(patient),
        patient.email,
        patient.obraSocial ?? "",
        patient.phone ?? "",
        patient.dni ?? "",
      ].join(" "),
    );
    const dni = (patient.dni ?? "").replace(/\D/g, "");
    const phone = (patient.phone ?? "").replace(/\D/g, "");

    if (q && haystack.includes(q)) return true;
    if (digits && (dni.includes(digits) || phone.includes(digits))) return true;
    return false;
  });
}

export const PATIENTS_PAGE_SIZE = 10;

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number = PATIENTS_PAGE_SIZE,
): {
  page: number;
  totalPages: number;
  total: number;
  items: T[];
} {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    total,
    items: items.slice(start, start + pageSize),
  };
}

export function uniqueObrasSociales(patients: Patient[]): string[] {
  const set = new Set<string>();
  for (const p of patients) {
    const value = p.obraSocial?.trim();
    if (value) set.add(value);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

export const SEX_LABELS: Record<PatientSex, string> = {
  female: "Femenino",
  male: "Masculino",
  other: "Otro",
  undisclosed: "Prefiero no decir",
};
