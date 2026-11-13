import {
  findById,
  isSlotTaken,
  listConfirmedAppointments,
  updateAppointment,
} from "@/lib/appointments";
import { getDefaultDoctor } from "@/lib/doctors";
import {
  syncAppointmentToDoctorCalendar,
  syncAppointmentToPatientCalendar,
} from "@/lib/google-calendar";
import { getPatientById } from "@/lib/patients";
import { availableSlotsForDate, endTimeFor } from "@/lib/slots";
import type { Appointment } from "@/lib/types";

export type RescheduleResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; error: string; status: number };

/** Reprograma un turno confirmado a fecha/hora libres. */
export async function rescheduleAppointmentById(
  id: string,
  date: string,
  startTime: string,
): Promise<RescheduleResult> {
  const appointment = await findById(id);
  if (!appointment) {
    return { ok: false, error: "Turno no encontrado", status: 404 };
  }
  if (appointment.status !== "confirmed") {
    return {
      ok: false,
      error: "Solo se pueden reprogramar turnos confirmados",
      status: 409,
    };
  }

  const doctor = await getDefaultDoctor();
  const confirmed = await listConfirmedAppointments(appointment.doctorId);
  const available = availableSlotsForDate(
    date,
    confirmed.filter((a) => a.id !== appointment.id),
    doctor,
  );

  if (!available.includes(startTime)) {
    return {
      ok: false,
      error: "Ese horario no está disponible",
      status: 409,
    };
  }

  if (await isSlotTaken(date, startTime, appointment.doctorId, id)) {
    return {
      ok: false,
      error: "Ese horario acaba de ocuparse",
      status: 409,
    };
  }

  const patient = await getPatientById(appointment.patientId);

  let updated = await updateAppointment(id, {
    date,
    startTime,
    endTime: endTimeFor(startTime, appointment.durationMinutes),
    status: "confirmed",
  });

  if (!updated) {
    return { ok: false, error: "No se pudo actualizar", status: 500 };
  }

  updated = {
    ...updated,
    patient: patient ?? updated.patient,
    doctor: {
      id: doctor.id,
      fullName: doctor.fullName,
      specialty: doctor.specialty,
    },
  };

  try {
    const sync = await syncAppointmentToDoctorCalendar(updated);
    updated =
      (await updateAppointment(id, {
        googleEventId: sync.eventId,
        calendarMode: sync.mode,
      })) ?? updated;
  } catch {
    // Keep the reschedule even if doctor calendar fails.
  }

  try {
    const patientSync = await syncAppointmentToPatientCalendar(
      updated,
      patient,
    );
    if (patientSync) {
      updated =
        (await updateAppointment(id, {
          patientGoogleEventId: patientSync.eventId,
        })) ?? updated;
    }
  } catch {
    // Keep the reschedule even if patient calendar fails.
  }

  return { ok: true, appointment: updated };
}
