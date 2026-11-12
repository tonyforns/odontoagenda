import { publicPatient } from "@/lib/db";
import type { Appointment } from "@/lib/types";

export function publicAppointment(appointment: Appointment): Appointment {
  return {
    ...appointment,
    patient: appointment.patient
      ? publicPatient(appointment.patient)
      : undefined,
  };
}
