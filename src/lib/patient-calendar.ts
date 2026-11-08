import { clinic, type Appointment } from "@/lib/clinic";
import { appointmentDateTimeISO } from "@/lib/slots";

function toGoogleDate(isoLocal: string): string {
  // Google template expects UTC-ish compact form YYYYMMDDTHHmmssZ
  // For Argentina fixed offset we convert -03:00 to Z by adding 3 hours.
  const d = new Date(isoLocal);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function googleCalendarAddUrl(appointment: Appointment): string {
  const start = appointmentDateTimeISO(appointment.date, appointment.startTime);
  const end = appointmentDateTimeISO(appointment.date, appointment.endTime);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Turno odontológico — ${clinic.name}`,
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: `Paciente: ${appointment.patientName}\nProfesional: ${clinic.doctorName}\nDirección: ${clinic.address}\nTel: ${clinic.phone}`,
    location: clinic.address,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs(appointment: Appointment): string {
  const start = appointmentDateTimeISO(appointment.date, appointment.startTime);
  const end = appointmentDateTimeISO(appointment.date, appointment.endTime);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const uid = `${appointment.id}@odontoagenda.app`;
  const summary = `Turno odontológico — ${clinic.name}`;
  const description = `Paciente: ${appointment.patientName}\\nProfesional: ${clinic.doctorName}\\nGestión con DNI + fecha de nacimiento en OdontoAgenda.`;

  const fmt = (iso: string) =>
    new Date(iso)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OdontoAgenda//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${clinic.address}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
