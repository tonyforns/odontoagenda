"use client";

import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { Appointment } from "@/lib/clinic";
import { googleCalendarAddUrl } from "@/lib/patient-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

function formatLongDate(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "EEEE d 'de' MMMM", {
    locale: es,
  });
}

export function ManageAppointments() {
  const [dni, setDni] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((data) => {
        setDates(data.dates ?? []);
        if (data.dates?.[0]) setNewDate(data.dates[0]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!newDate || !rescheduleId) return;
    fetch(`/api/availability?date=${newDate}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]));
  }, [newDate, rescheduleId]);

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/appointments?dni=${encodeURIComponent(dni)}&birthDate=${encodeURIComponent(birthDate)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo buscar");
        setAppointments([]);
        setSearched(true);
        return;
      }
      setAppointments(data.appointments ?? []);
      setSearched(true);
    });
  }

  function cancelAppointment(appointment: Appointment) {
    if (!confirm("¿Cancelar este turno?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manageToken: appointment.manageToken,
          action: "cancel",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo cancelar");
        return;
      }
      setMessage(data.message);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointment.id ? data.appointment : a)),
      );
    });
  }

  function confirmReschedule(appointment: Appointment) {
    startTransition(async () => {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manageToken: appointment.manageToken,
          action: "reschedule",
          date: newDate,
          startTime: newTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo reprogramar");
        return;
      }
      setMessage(data.message);
      setRescheduleId(null);
      setNewTime("");
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointment.id ? data.appointment : a)),
      );
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={lookup} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dni">DNI</Label>
          <Input
            id="dni"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            required
            placeholder="30111222"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthDate">Fecha de nacimiento</Label>
          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending} className="bg-teal-800 hover:bg-teal-900">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Buscando…
              </>
            ) : (
              "Buscar mis turnos"
            )}
          </Button>
        </div>
      </form>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          {message}
        </p>
      ) : null}

      {searched && appointments.length === 0 ? (
        <p className="text-teal-900/70">
          No encontramos turnos con ese DNI y fecha de nacimiento. Probá el
          ejemplo demo: DNI <strong>30111222</strong>, nacimiento{" "}
          <strong>1990-05-12</strong>.
        </p>
      ) : null}

      <ul className="space-y-4">
        {appointments.map((appointment) => (
          <li
            key={appointment.id}
            className="rounded-2xl border border-teal-900/10 bg-white/80 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-[family-name:var(--font-display)] text-xl text-teal-950">
                  {formatLongDate(appointment.date)} · {appointment.startTime} hs
                </p>
                <p className="mt-1 text-sm text-teal-900/70">
                  {appointment.patientName}
                </p>
              </div>
              <Badge
                variant={
                  appointment.status === "confirmed" ? "default" : "secondary"
                }
                className={
                  appointment.status === "confirmed"
                    ? "bg-teal-800"
                    : undefined
                }
              >
                {appointment.status === "confirmed" ? "Confirmado" : "Cancelado"}
              </Badge>
            </div>

            {appointment.status === "confirmed" ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={googleCalendarAddUrl(appointment)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <CalendarPlus className="size-4" />
                      Google Calendar
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={`/api/appointments/${appointment.id}/ics`}>
                      Descargar .ics
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setRescheduleId(appointment.id);
                      setMessage(null);
                      setError(null);
                    }}
                  >
                    Reprogramar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => cancelAppointment(appointment)}
                  >
                    Cancelar
                  </Button>
                </div>

                {rescheduleId === appointment.id ? (
                  <div className="rounded-xl border border-teal-900/10 bg-teal-50/50 p-4">
                    <p className="mb-3 text-sm font-medium text-teal-950">
                      Elegí el nuevo horario
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        className="flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                        value={newDate}
                        onChange={(e) => {
                          setNewDate(e.target.value);
                          setNewTime("");
                        }}
                      >
                        {dates.map((d) => (
                          <option key={d} value={d}>
                            {formatLongDate(d)}
                          </option>
                        ))}
                      </select>
                      <select
                        className="flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                      >
                        <option value="">Horario…</option>
                        {slots.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        className="bg-teal-800 hover:bg-teal-900"
                        disabled={!newTime || pending}
                        onClick={() => confirmReschedule(appointment)}
                      >
                        Confirmar cambio
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRescheduleId(null)}
                      >
                        Cerrar
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
