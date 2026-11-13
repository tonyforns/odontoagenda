import { z } from "zod";

export const adminAppointmentPatchSchema = z
  .object({
    action: z.enum(["cancel", "reschedule"]),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action !== "reschedule") return;
    if (!data.date) {
      ctx.addIssue({
        code: "custom",
        message: "Indicá fecha para reprogramar",
        path: ["date"],
      });
    }
    if (!data.startTime) {
      ctx.addIssue({
        code: "custom",
        message: "Indicá hora para reprogramar",
        path: ["startTime"],
      });
    }
  });

export type AdminAppointmentPatch = z.infer<typeof adminAppointmentPatchSchema>;
