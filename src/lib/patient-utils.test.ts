import { describe, expect, it } from "vitest";
import {
  filterPatients,
  paginateItems,
  patientDisplayName,
  sortPatientsByName,
  uniqueObrasSociales,
} from "@/lib/patient-utils";
import type { Patient } from "@/lib/types";

function patient(partial: Partial<Patient> & Pick<Patient, "id" | "email">): Patient {
  return {
    googleSub: partial.googleSub ?? `sub-${partial.id}`,
    firstName: partial.firstName ?? "",
    lastName: partial.lastName ?? "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("patientDisplayName", () => {
  it("joins first and last name", () => {
    expect(
      patientDisplayName(
        patient({ id: "1", email: "a@b.com", firstName: "Ana", lastName: "López" }),
      ),
    ).toBe("Ana López");
  });

  it("falls back to email when name is empty", () => {
    expect(
      patientDisplayName(patient({ id: "1", email: "solo@mail.com" })),
    ).toBe("solo@mail.com");
  });
});

describe("sortPatientsByName", () => {
  it("sorts by display name", () => {
    const sorted = sortPatientsByName([
      patient({ id: "2", email: "z@z.com", firstName: "Zoe", lastName: "Zeta" }),
      patient({ id: "1", email: "a@a.com", firstName: "Ana", lastName: "Alvarez" }),
    ]);
    expect(sorted.map((p) => p.id)).toEqual(["1", "2"]);
  });
});

describe("filterPatients", () => {
  const sample = [
    patient({
      id: "1",
      email: "ana@mail.com",
      firstName: "Ana",
      lastName: "López",
      dni: "30111222",
      phone: "11 5555-1212",
      obraSocial: "OSDE",
    }),
    patient({
      id: "2",
      email: "bruno@mail.com",
      firstName: "Bruno",
      lastName: "Pérez",
      dni: "28999888",
      phone: "11 4000-9999",
      obraSocial: "Particular",
    }),
  ];

  it("filters by name ignoring accents", () => {
    expect(filterPatients(sample, "lopez").map((p) => p.id)).toEqual(["1"]);
  });

  it("filters by DNI digits", () => {
    expect(filterPatients(sample, "30111").map((p) => p.id)).toEqual(["1"]);
  });

  it("filters by obra social", () => {
    expect(filterPatients(sample, "", "Particular").map((p) => p.id)).toEqual([
      "2",
    ]);
  });
});

describe("uniqueObrasSociales", () => {
  it("returns sorted unique values", () => {
    expect(
      uniqueObrasSociales([
        patient({ id: "1", email: "a@a.com", obraSocial: "OSDE" }),
        patient({ id: "2", email: "b@b.com", obraSocial: "Particular" }),
        patient({ id: "3", email: "c@c.com", obraSocial: "OSDE" }),
      ]),
    ).toEqual(["OSDE", "Particular"]);
  });
});

describe("paginateItems", () => {
  it("slices by page size and clamps page", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const page1 = paginateItems(items, 1, 10);
    expect(page1.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(page1.totalPages).toBe(2);
    expect(paginateItems(items, 99, 10).page).toBe(2);
    expect(paginateItems(items, 0, 10).page).toBe(1);
  });

  it("handles empty list", () => {
    const empty = paginateItems([], 3, 10);
    expect(empty).toEqual({
      page: 1,
      totalPages: 1,
      total: 0,
      items: [],
    });
  });
});
