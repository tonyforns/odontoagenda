export const clinic = {
  brand: "OdontoAgenda",
  name: "Consultorio Odontológico Aurora",
  doctorName: "Dra. Camila Ríos",
  specialty: "Odontología general",
  address: "Av. Santa Fe 2840, CABA",
  phone: "+54 11 4567-8900",
  timezone: "America/Argentina/Buenos_Aires",
  slotMinutes: 30,
  /** Días laborales: 1=lun … 5=vie */
  workDays: [1, 2, 3, 4, 5] as number[],
  windows: [
    { start: "09:00", end: "12:00" },
    { start: "15:00", end: "18:00" },
  ],
  bookingHorizonDays: 21,
} as const;

export type AppointmentStatus = "confirmed" | "cancelled";

export type Appointment = {
  id: string;
  patientName: string;
  dni: string;
  birthDate: string; // YYYY-MM-DD
  phone: string;
  email?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  manageToken: string;
  googleEventId?: string | null;
  calendarMode: "google" | "mock";
  createdAt: string;
  updatedAt: string;
};

export type CreateAppointmentInput = {
  patientName: string;
  dni: string;
  birthDate: string;
  phone: string;
  email?: string;
  date: string;
  startTime: string;
};
