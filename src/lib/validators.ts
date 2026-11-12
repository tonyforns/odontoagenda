import { z } from "zod";

export function normalizeDni(value: string): string {
  return value.replace(/\D/g, "");
}

export const patientProfileSchema = z.object({
  firstName: z.string().trim().min(2, "Ingresá el nombre").max(60),
  lastName: z.string().trim().min(2, "Ingresá el apellido").max(60),
  dni: z
    .string()
    .trim()
    .transform(normalizeDni)
    .refine((v) => /^\d{7,8}$/.test(v), "DNI inválido (7 u 8 dígitos)"),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de nacimiento inválida"),
  sex: z.enum(["female", "male", "other", "undisclosed"]),
  obraSocial: z.string().trim().min(2, "Indicá la obra social").max(80),
  phone: z.string().trim().min(8, "Teléfono demasiado corto").max(20),
});

export const bookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  doctorId: z.string().min(1).optional(),
});

export const lookupSchema = z.object({
  dni: z
    .string()
    .trim()
    .transform(normalizeDni)
    .refine((v) => /^\d{7,8}$/.test(v), "DNI inválido"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const manageSchema = z.object({
  manageToken: z.string().min(16),
  action: z.enum(["cancel", "reschedule"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});
