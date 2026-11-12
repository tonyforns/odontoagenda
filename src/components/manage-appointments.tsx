"use client";

import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarPlus, Loader2, LogIn } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import type { Appointment } from "@/lib/types";
import { googleCalendarAddUrl } from "@/lib/patient-calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

function formatLongDate(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "EEEE d 'de' MMMM", {
    locale: es,
  });
}

export function ManageAppointments() {
  const { data: session, status } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
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

  useEffect(() => {
    if (status !== "authenticated") {
      setAppointments([]);
      setLoaded(false);
      return;
    }
    setError(null);
    fetch("/api/appointments")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar");
        setAppointments(data.appointments ?? []);
        setLoaded(true);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoaded(true);
      });
  }, [status]);

  function cancel(appointment: Appointment) {
    setError(null);
    setMessage(null);
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
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointment.id ? data.appointment : a)),
      );
      setMessage(data.message ?? "Turno cancelado.");
    });
  }

  function reschedule(appointment: Appointment) {
    if (!newDate || !newTime) return;
    setError(null);
    setMessage(null);
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
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointment.id ? data.appointment : a)),
      );
      setRescheduleId(null);
      setMessage(data.message ?? "Turno reprogramado.");
    });
  }

  if (status === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-teal-900/70">
        <Loader2 className="size-4 animate-spin" /> Cargando…
      </p>
    );
  }

  if (!session?.user) {
    return (
      <div className="space-y-4">
        <p className="text-teal-900/75">
          Iniciá sesión con Gmail para ver, cancelar o reprogramar tus turnos.
        </p>
        <Button
          className="bg-teal-800 hover:bg-teal-900"
          onClick={() => signIn("google", { callbackUrl: "/mis-turnos" })}
        >
          <LogIn className="size-4" />
          Continuar con Gmail
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {error ? (
        <p className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          {message}
        </p>
      ) : null}

      {!loaded ? (
        <p className="flex items-center gap-2 text-sm text-teal-900/70">
          <Loader2 className="size-4 animate-spin" /> Buscando turnos…
        </p>
      ) : appointments.length === 0 ? (
        <p className="text-sm text-teal-900/70">No tenés turnos registrados.</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
          {appointments.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-teal-900/10 bg-white/90 p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium capitalize text-teal-950">
                    {formatLongDate(a.date)} · {a.startTime} hs
                    <span className="text-teal-900/60">
                      {" "}
                      ({a.durationMinutes} min)
                    </span>
                  </p>
                  <div className="mt-2">
                    <Badge
                      variant={
                        a.status === "confirmed" ? "default" : "secondary"
                      }
                    >
                      {a.status === "confirmed" ? "Confirmado" : "Cancelado"}
                    </Badge>
                  </div>
                </div>
                {a.status === "confirmed" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={googleCalendarAddUrl(a)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <CalendarPlus className="size-4" />
                        Calendar
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        setRescheduleId(a.id);
                        setNewTime("");
                      }}
                    >
                      Reprogramar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => cancel(a)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : null}
              </div>

              {rescheduleId === a.id ? (
                <div className="mt-4 space-y-3 border-t border-teal-900/10 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor={`date-${a.id}`}>Nueva fecha</Label>
                    <select
                      id={`date-${a.id}`}
                      className="flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    >
                      {dates.map((d) => (
                        <option key={d} value={d}>
                          {formatLongDate(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setNewTime(slot)}
                        className={`rounded-lg border px-3 py-1.5 text-sm ${
                          newTime === slot
                            ? "border-teal-800 bg-teal-800 text-white"
                            : "border-teal-900/15 bg-white"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending || !newTime}
                      className="bg-teal-800 hover:bg-teal-900"
                      onClick={() => reschedule(a)}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
