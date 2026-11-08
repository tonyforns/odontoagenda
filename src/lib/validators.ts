import { z } from "zod";

export function normalizeDni(value: string): string {
  return value.replace(/\D/g, "");
}

export const bookingSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(3, "Ingresá el nombre completo")
    .max(80),
  dni: z
    .string()
    .trim()
    .transform(normalizeDni)
    .refine((v) => /^\d{7,8}$/.test(v), "DNI inválido (7 u 8 dígitos)"),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de nacimiento inválida"),
  phone: z
    .string()
    .trim()
    .min(8, "Teléfono demasiado corto")
    .max(20),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
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
