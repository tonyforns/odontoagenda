import type { Appointment } from "@/lib/types";

/** Agrupa turnos por fecha (yyyy-MM-dd), ordenados por hora. */
export function groupAppointmentsByDate(
  appointments: Appointment[],
): Map<string, Appointment[]> {
  const map = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    const list = map.get(appointment.date) ?? [];
    list.push(appointment);
    map.set(appointment.date, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return map;
}

/** Mejor día inicial: próximo confirmado, si no hoy con turnos, si no el primero. */
export function initialAppointmentDate(
  appointments: Appointment[],
  today: string,
): string | null {
  if (appointments.length === 0) return null;

  const upcoming = appointments
    .filter((a) => a.status === "confirmed" && a.date >= today)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
    );
  if (upcoming[0]) return upcoming[0].date;

  const onToday = appointments.find((a) => a.date === today);
  if (onToday) return today;

  return [...appointments].sort((a, b) => a.date.localeCompare(b.date))[0]
    ?.date ?? null;
}

export function appointmentDayTone(
  dayAppointments: Appointment[],
): "confirmed" | "cancelled" | "mixed" | null {
  if (dayAppointments.length === 0) return null;
  const hasConfirmed = dayAppointments.some((a) => a.status === "confirmed");
  const hasCancelled = dayAppointments.some((a) => a.status === "cancelled");
  if (hasConfirmed && hasCancelled) return "mixed";
  if (hasConfirmed) return "confirmed";
  return "cancelled";
}
