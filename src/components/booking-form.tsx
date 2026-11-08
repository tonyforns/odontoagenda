"use client";

import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarPlus, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { Appointment } from "@/lib/clinic";
import { googleCalendarAddUrl } from "@/lib/patient-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "form" | "success";

function formatLongDate(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "EEEE d 'de' MMMM", {
    locale: es,
  });
}

export function BookingForm() {
  const [dates, setDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [patientName, setPatientName] = useState("");
  const [dni, setDni] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [created, setCreated] = useState<Appointment | null>(null);
  const [calendarMode, setCalendarMode] = useState<"google" | "mock">("mock");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((data) => {
        setDates(data.dates ?? []);
        if (data.dates?.[0]) setDate(data.dates[0]);
      })
      .catch(() => setError("No se pudieron cargar las fechas disponibles."));
  }, []);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    setStartTime("");
    fetch(`/api/availability?date=${date}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setError("No se pudieron cargar los horarios."))
      .finally(() => setLoadingSlots(false));
  }, [date]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName,
          dni,
          birthDate,
          phone,
          email,
          date,
          startTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo reservar el turno.");
        return;
      }
      setCreated(data.appointment);
      setCalendarMode(data.calendar?.mode ?? data.appointment.calendarMode);
      setStep("success");
    });
  }

  if (step === "success" && created) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-500">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 size-7 text-teal-700" />
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
              Turno confirmado
            </h2>
            <p className="mt-2 text-teal-900/80">
              {formatLongDate(created.date)} a las {created.startTime} hs con la
              profesional. Quedó asociado a tu DNI {created.dni}.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <p className="text-sm text-teal-900/70">
            Calendario del consultorio:{" "}
            <span className="font-medium text-teal-950">
              {calendarMode === "google"
                ? "sincronizado con Google Calendar"
                : "modo demo (sin credenciales de Google)"}
            </span>
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="bg-teal-800 hover:bg-teal-900">
              <a
                href={googleCalendarAddUrl(created)}
                target="_blank"
                rel="noreferrer"
              >
                <CalendarPlus className="size-4" />
                Agregar a mi Google Calendar
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`/api/appointments/${created.id}/ics`}>
                Descargar .ics
              </a>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/mis-turnos">Gestionar / cancelar</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setStep("form");
              setCreated(null);
              setStartTime("");
            }}
          >
            Reservar otro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-teal-950">
          Tus datos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="patientName">Nombre y apellido</Label>
            <Input
              id="patientName"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
              placeholder="Ana Gómez"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              inputMode="numeric"
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
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="11 5555-1212"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ana@correo.com"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-teal-950">
          Fecha y horario
        </h2>
        <div className="space-y-2">
          <Label htmlFor="date">Día disponible</Label>
          <select
            id="date"
            className="flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          >
            {dates.map((d) => (
              <option key={d} value={d}>
                {formatLongDate(d)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Horarios libres</Label>
          {loadingSlots ? (
            <p className="flex items-center gap-2 text-sm text-teal-900/70">
              <Loader2 className="size-4 animate-spin" /> Cargando…
            </p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-teal-900/70">
              No hay horarios libres ese día. Probá otra fecha.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {slots.map((slot) => {
                const selected = startTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setStartTime(slot)}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      selected
                        ? "border-teal-800 bg-teal-800 text-white shadow-sm"
                        : "border-teal-900/15 bg-white text-teal-950 hover:border-teal-700/40 hover:bg-teal-50"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || !startTime}
        className="bg-teal-800 hover:bg-teal-900"
        size="lg"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Reservando…
          </>
        ) : (
          "Confirmar turno"
        )}
      </Button>
    </form>
  );
}
