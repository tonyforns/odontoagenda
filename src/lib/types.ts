export type PatientSex = "female" | "male" | "other" | "undisclosed";

/** Roles de personal en clinic_staff. Paciente = sin fila. */
export type StaffRole = "admin" | "medico" | "secretaria";

/** Rol efectivo en sesión Auth.js. */
export type AppRole = StaffRole | "paciente";

export type ClinicStaff = {
  id: string;
  email: string;
  googleSub?: string | null;
  role: StaffRole;
  doctorId?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DoctorWindow = { start: string; end: string };

export type Doctor = {
  id: string;
  fullName: string;
  specialty: string;
  email?: string;
  phone?: string;
  address?: string;
  timezone: string;
  slotMinutes: number;
  workDays: number[];
  windows: DoctorWindow[];
  bookingHorizonDays: number;
  pin: string;
  googleCalendarId?: string | null;
  googleRefreshToken?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Patient = {
  id: string;
  googleSub: string;
  email: string;
  firstName: string;
  lastName: string;
  dni?: string | null;
  birthDate?: string | null;
  sex?: PatientSex | null;
  obraSocial?: string | null;
  phone?: string | null;
  /** Server-only: never send to the client */
  googleRefreshToken?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentStatus = "confirmed" | "cancelled";

export type Appointment = {
  id: string;
  doctorId: string;
  patientId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  endTime: string;
  status: AppointmentStatus;
  manageToken: string;
  googleEventId?: string | null;
  patientGoogleEventId?: string | null;
  calendarMode: "google" | "mock";
  createdAt: string;
  updatedAt: string;
  /** Joined patient fields for UI / calendar */
  patient?: Patient;
  doctor?: Pick<Doctor, "id" | "fullName" | "specialty">;
};

export type CreateAppointmentInput = {
  doctorId: string;
  patientId: string;
  date: string;
  startTime: string;
  durationMinutes?: number;
};

export type PatientProfileInput = {
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string;
  sex: PatientSex;
  obraSocial: string;
  phone: string;
};
