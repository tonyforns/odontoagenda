import { findById, updateAppointment } from "@/lib/appointments";
import {
  removeAppointmentFromDoctorCalendar,
  removeAppointmentFromPatientCalendar,
} from "@/lib/google-calendar";
import { getPatientById } from "@/lib/patients";
import type { Appointment } from "@/lib/types";

/** Cancela un turno y limpia calendarios. Idempotente si ya estaba cancelado. */
export async function cancelAppointmentById(
  id: string,
): Promise<Appointment | undefined> {
  const appointment = await findById(id);
  if (!appointment) return undefined;

  if (appointment.status === "cancelled") return appointment;

  const patient = await getPatientById(appointment.patientId);
  await removeAppointmentFromDoctorCalendar(appointment.googleEventId);
  await removeAppointmentFromPatientCalendar(appointment, patient);

  return (
    (await updateAppointment(id, {
      status: "cancelled",
      patientGoogleEventId: null,
    })) ?? undefined
  );
}
