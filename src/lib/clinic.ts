import type { Doctor } from "@/lib/types";

export const clinic = {
  brand: "OdontoAgenda",
  name: "Consultorio Odontológico Aurora",
  /** Fallback display until doctor row is loaded */
  doctorName: "Dr. Rafael Lovera",
  specialty: "Odontología general",
  address: "Av. Santa Fe 2840, CABA",
  phone: "+54 11 4567-8900",
  timezone: "America/Argentina/Buenos_Aires",
  slotMinutes: 30,
  workDays: [1, 2, 3, 4, 5] as number[],
  windows: [
    { start: "09:00", end: "12:00" },
    { start: "15:00", end: "18:00" },
  ],
  bookingHorizonDays: 21,
  defaultDoctorId: "doc_rafael_lovera",
} as const;

export const DEFAULT_DOCTOR_SEED: Omit<Doctor, "createdAt" | "updatedAt"> = {
  id: clinic.defaultDoctorId,
  fullName: clinic.doctorName,
  specialty: clinic.specialty,
  phone: clinic.phone,
  address: clinic.address,
  timezone: clinic.timezone,
  slotMinutes: clinic.slotMinutes,
  workDays: [...clinic.workDays],
  windows: clinic.windows.map((w) => ({ ...w })),
  bookingHorizonDays: clinic.bookingHorizonDays,
  pin: process.env.DOCTOR_PIN || "1752",
  googleCalendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || null,
};

export type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
  Doctor,
  Patient,
  PatientProfileInput,
  PatientSex,
} from "@/lib/types";
