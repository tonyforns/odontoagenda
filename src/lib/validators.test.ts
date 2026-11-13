import { describe, expect, it } from "vitest";
import {
  adminAssignSchema,
  adminPatientCreateSchema,
  bookingSchema,
  doctorScheduleReplaceSchema,
  normalizeDni,
  patientProfileSchema,
  staffPatchSchema,
  staffUpsertSchema,
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

describe("adminPatientCreateSchema", () => {
  it("accepts ficha with optional email", () => {
    const result = adminPatientCreateSchema.safeParse({
      firstName: "Ana",
      lastName: "López",
      dni: "30.111.222",
      birthDate: "1990-05-12",
      sex: "female",
      obraSocial: "OSDE",
      phone: "1155551212",
      email: " ana@mail.com ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dni).toBe("30111222");
      expect(result.data.email).toBe("ana@mail.com");
    }
  });
});

describe("staffUpsertSchema", () => {
  it("normalizes email and accepts roles", () => {
    const result = staffUpsertSchema.safeParse({
      email: "  Sec@Gmail.com ",
      role: "secretaria",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("sec@gmail.com");
    }
  });

  it("rejects invalid role", () => {
    const result = staffUpsertSchema.safeParse({
      email: "a@b.com",
      role: "paciente",
    });
    expect(result.success).toBe(false);
  });
});

describe("staffPatchSchema", () => {
  it("accepts active or role", () => {
    expect(staffPatchSchema.safeParse({ active: false }).success).toBe(true);
    expect(staffPatchSchema.safeParse({ role: "medico" }).success).toBe(true);
  });

  it("rejects empty patch", () => {
    expect(staffPatchSchema.safeParse({}).success).toBe(false);
  });
});

describe("doctorScheduleReplaceSchema", () => {
  it("accepts windows and normalizes HH:mm:ss", () => {
    const result = doctorScheduleReplaceSchema.safeParse({
      windows: [
        { weekday: 1, startTime: "09:00:00", endTime: "12:00:00" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.windows[0]).toMatchObject({
        startTime: "09:00",
        endTime: "12:00",
      });
    }
  });

  it("rejects end before start", () => {
    const result = doctorScheduleReplaceSchema.safeParse({
      windows: [{ weekday: 1, startTime: "12:00", endTime: "09:00" }],
    });
    expect(result.success).toBe(false);
  });
});
