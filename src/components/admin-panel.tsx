"use client";

import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { Appointment } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatLongDate(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "EEE d MMM", {
    locale: es,
  });
}

export function AdminPanel() {
  const [pin, setPin] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarMode, setCalendarMode] = useState<"google" | "mock" | null>(
    null,
  );
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pending, startTransition] = useTransition();

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/appointments", {
        headers: { "x-doctor-pin": pin },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Acceso denegado");
        setUnlocked(false);
        return;
      }
      setAppointments(data.appointments ?? []);
      setCalendarMode(data.calendar?.mode ?? null);
      setHint(data.demoPinHint);
      setUnlocked(true);
    });
  }

  if (!unlocked) {
    return (
      <form onSubmit={unlock} className="mx-auto max-w-sm space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pin">PIN del consultorio</Label>
          <Input
            id="pin"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            placeholder="••••••"
          />
          <p className="text-xs text-teal-900/60">
            En demo el PIN es <code>1752</code>. En producción usá el secreto{" "}
            <code>DOCTOR_PIN</code>.
          </p>
        </div>
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="bg-teal-800 hover:bg-teal-900">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Entrando…
            </>
          ) : (
            "Ver agenda"
          )}
        </Button>
      </form>
    );
  }

  const upcoming = appointments
    .filter((a) => a.status === "confirmed")
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4 text-sm text-teal-900/80">
        Google Calendar del profesional:{" "}
        <strong className="text-teal-950">
          {calendarMode === "google" ? "conectado" : "modo demo"}
        </strong>
        {hint ? (
          <span className="block mt-1 text-xs">
            PIN demo activo: <code>{hint}</code>
          </span>
        ) : null}
      </div>

      {upcoming.length === 0 ? (
        <p className="text-teal-900/70">No hay turnos confirmados.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-teal-900/10 bg-white/80">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-teal-900/10 text-teal-900/60">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Hora</th>
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="px-4 py-3 font-medium">DNI</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Calendario</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((a) => (
                <tr key={a.id} className="border-b border-teal-900/5 last:border-0">
                  <td className="px-4 py-3 capitalize">{formatLongDate(a.date)}</td>
                  <td className="px-4 py-3">{a.startTime}</td>
                  <td className="px-4 py-3 font-medium text-teal-950">
                    {a.patient
                      ? `${a.patient.firstName} ${a.patient.lastName}`.trim()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{a.patient?.dni ?? "—"}</td>
                  <td className="px-4 py-3">{a.patient?.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">
                      {a.calendarMode === "google" ? "Google" : "Demo"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
