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

export const adminPatientCreateSchema = patientProfileSchema.extend({
  email: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Email inválido",
    ),
});

export const adminAssignSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    doctorId: z.string().min(1).optional(),
    patientId: z.string().min(1).optional(),
    patient: adminPatientCreateSchema.optional(),
  })
  .refine((data) => Boolean(data.patientId) || Boolean(data.patient), {
    message: "Elegí un paciente o creá una ficha nueva.",
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

export const staffUpsertSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido")
    .max(120),
  role: z.enum(["admin", "medico", "secretaria"]),
});

export const staffPatchSchema = z
  .object({
    active: z.boolean().optional(),
    role: z.enum(["admin", "medico", "secretaria"]).optional(),
  })
  .refine(
    (data) => data.active !== undefined || data.role !== undefined,
    "Nada para actualizar.",
  );

const timeHm = z
  .string()
  .trim()
  .transform((value) => value.slice(0, 5))
  .refine((value) => /^\d{2}:\d{2}$/.test(value), "Horario inválido (HH:mm)");

export const doctorScheduleWindowInputSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: timeHm,
    endTime: timeHm,
  })
  .refine((w) => w.startTime < w.endTime, {
    message: "La hora de fin debe ser posterior al inicio.",
  });

export const doctorScheduleReplaceSchema = z.object({
  doctorId: z.string().min(1).optional(),
  windows: z.array(doctorScheduleWindowInputSchema).max(50),
});
