import { describe, expect, it } from "vitest";
import {
  appointmentDayTone,
  groupAppointmentsByDate,
  initialAppointmentDate,
} from "./patient-appointments";
import type { Appointment } from "./types";

function appt(
  partial: Pick<Appointment, "id" | "date" | "startTime" | "status">,
): Appointment {
  return {
    doctorId: "doc",
    patientId: "pat",
    durationMinutes: 30,
    endTime: "10:30",
    manageToken: "token-token-token",
    calendarMode: "mock",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("groupAppointmentsByDate", () => {
  it("agrupa y ordena por hora", () => {
    const map = groupAppointmentsByDate([
      appt({ id: "2", date: "2026-11-12", startTime: "15:00", status: "confirmed" }),
      appt({ id: "1", date: "2026-11-12", startTime: "09:00", status: "confirmed" }),
      appt({ id: "3", date: "2026-11-13", startTime: "10:00", status: "cancelled" }),
    ]);
    expect([...map.keys()]).toEqual(["2026-11-12", "2026-11-13"]);
    expect(map.get("2026-11-12")?.map((a) => a.startTime)).toEqual([
      "09:00",
      "15:00",
    ]);
  });
});

describe("initialAppointmentDate", () => {
  it("elige el próximo confirmado", () => {
    expect(
      initialAppointmentDate(
        [
          appt({
            id: "1",
            date: "2026-11-01",
            startTime: "09:00",
            status: "confirmed",
          }),
          appt({
            id: "2",
            date: "2026-11-20",
            startTime: "10:00",
            status: "confirmed",
          }),
        ],
        "2026-11-12",
      ),
    ).toBe("2026-11-20");
  });
});

describe("appointmentDayTone", () => {
  it("distingue confirmado / cancelado / mixed", () => {
    expect(
      appointmentDayTone([
        appt({
          id: "1",
          date: "2026-11-12",
          startTime: "09:00",
          status: "confirmed",
        }),
      ]),
    ).toBe("confirmed");
    expect(
      appointmentDayTone([
        appt({
          id: "1",
          date: "2026-11-12",
          startTime: "09:00",
          status: "cancelled",
        }),
      ]),
    ).toBe("cancelled");
    expect(
      appointmentDayTone([
        appt({
          id: "1",
          date: "2026-11-12",
          startTime: "09:00",
          status: "confirmed",
        }),
        appt({
          id: "2",
          date: "2026-11-12",
          startTime: "10:00",
          status: "cancelled",
        }),
      ]),
    ).toBe("mixed");
  });
});
