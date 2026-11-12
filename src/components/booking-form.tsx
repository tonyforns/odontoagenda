"use client";

import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Loader2,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { PatientProfileForm } from "@/components/patient-profile-form";
import { clinic } from "@/lib/clinic";
import { googleCalendarAddUrl } from "@/lib/patient-calendar";
import type { Appointment, Patient } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = "form" | "success";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "Falló el callback de Google (Auth.js lo oculta como Configuration). Suele ser issuer/id_token o Client Secret. Tras reintentar, abrí /api/auth/status y mirá lastAuthError.",
  AccessDenied:
    "Google rechazó el acceso. Agregá tu Gmail en Test users (Google Cloud → OAuth consent).",
  Verification: "No se pudo verificar el login. Probá de nuevo.",
  OAuthCallback:
    "Falló el callback de Google. Revisá Client Secret y el redirect URI exacto en Google Cloud.",
  OAuthAccountNotLinked: "Esa cuenta ya está vinculada de otra forma.",
  Callback:
    "Falló el intercambio del código OAuth (secret o redirect URI incorrectos).",
  Default: "No se pudo completar el login con Gmail.",
};

function formatLongDate(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "EEEE d 'de' MMMM", {
    locale: es,
  });
}

export function BookingForm() {
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const authError = searchParams.get("error");
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(
    null,
  );
  const [patient, setPatient] = useState<Patient | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [created, setCreated] = useState<Appointment | null>(null);
  const [calendarMode, setCalendarMode] = useState<"google" | "mock">("mock");
  const [patientCalendarSynced, setPatientCalendarSynced] = useState(false);
  const [pending, startTransition] = useTransition();
  const [oauthCallbackUrl, setOauthCallbackUrl] = useState(
    "https://odontoagenda.vercel.app/api/auth/callback/google",
  );

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        setGoogleConfigured(Boolean(data.googleConfigured));
        if (typeof data.callbackUrl === "string" && data.callbackUrl) {
          setOauthCallbackUrl(data.callbackUrl);
        }
      })
      .catch(() => setGoogleConfigured(false));
  }, []);

  // Tras volver de Google, refrescar sesión una vez (evita UI stale).
  useEffect(() => {
    void update();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setPatient(null);
      setProfileComplete(false);
      return;
    }
    setLoadingPatient(true);
    fetch("/api/patients/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.patient) {
          setPatient(data.patient);
          setProfileComplete(Boolean(data.complete));
        }
      })
      .catch(() => setError("No se pudo cargar tu ficha."))
      .finally(() => setLoadingPatient(false));
  }, [status]);

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((data) => setDates(data.dates ?? []))
      .catch(() => setError("No se pudieron cargar las fechas disponibles."));
  }, []);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      setStartTime("");
      return;
    }
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
        body: JSON.stringify({ date, startTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo reservar el turno.");
        return;
      }
      setCreated(data.appointment);
      setCalendarMode(data.calendar?.mode ?? data.appointment.calendarMode);
      setPatientCalendarSynced(Boolean(data.patientCalendarSynced));
      setStep("success");
    });
  }

  if (step === "success" && created) {
    const name = created.patient
      ? `${created.patient.firstName} ${created.patient.lastName}`.trim()
      : patient
        ? `${patient.firstName} ${patient.lastName}`.trim()
        : "";
    return (
      <div className="space-y-6 animate-rise">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-800/10 text-teal-800">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-teal-950">
              Turno confirmado
            </h2>
            <p className="mt-2 max-w-md text-teal-900/75 leading-relaxed">
              <span className="capitalize">{formatLongDate(created.date)}</span>
              {" · "}
              {created.startTime} hs ({created.durationMinutes} min)
              <br />
              con {clinic.doctorName}
              {name ? ` · ${name}` : ""}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-teal-900/8 bg-teal-50/50 p-5">
          <p className="text-sm text-teal-900/70">
            {patientCalendarSynced ? (
              <>
                El turno se agregó automáticamente a{" "}
                <span className="font-medium text-teal-950">tu Google Calendar</span>.
              </>
            ) : (
              <>
                No se pudo agregar solo a tu Calendar. Podés sumarlo manualmente
                abajo
                {calendarMode === "mock"
                  ? " (el calendario del consultorio está en modo demo)"
                  : ""}
                .
              </>
            )}
          </p>
          {!patientCalendarSynced ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
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
          ) : (
            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <a href={`/api/appointments/${created.id}/ics`}>
                  Descargar .ics
                </a>
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/mis-turnos">Gestionar / cancelar</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setStep("form");
              setCreated(null);
              setDate("");
              setStartTime("");
              setSlots([]);
            }}
          >
            Reservar otro
          </Button>
        </div>
      </div>
    );
  }

  if (status === "loading" || googleConfigured === null) {
    return (
      <p className="flex h-full items-center justify-center gap-2 text-sm text-teal-900/60">
        <Loader2 className="size-4 animate-spin" /> Preparando reserva…
      </p>
    );
  }

  if (!session?.user) {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center space-y-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-teal-800/10 text-teal-800">
          <LogIn className="size-5" />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-teal-950">
            Iniciá con Gmail
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-teal-900/70">
            Asociamos el turno a tu cuenta para cancelar o reprogramar después.
          </p>
        </div>
        {authError ? (
          <div className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-950">
            <p className="font-medium">No se pudo iniciar sesión</p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {AUTH_ERROR_MESSAGES[authError] ??
                AUTH_ERROR_MESSAGES.Default}
            </p>
            <code className="mt-2 block break-all text-[0.65rem] opacity-70">
              error={authError}
            </code>
          </div>
        ) : null}
        {googleConfigured ? (
          <Button
            type="button"
            size="lg"
            className="bg-teal-800 hover:bg-teal-900"
            onClick={() =>
              signIn("google", {
                callbackUrl: "/reservar",
                redirect: true,
              })
            }
          >
            Continuar con Gmail
          </Button>
        ) : (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950">
            <p className="font-medium">Falta configurar Google OAuth</p>
            <p className="mt-1 text-xs opacity-80">
              En Vercel seteá AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET y AUTH_URL.
              Redirect URI en Google:
            </p>
            <code className="mt-2 block break-all text-xs opacity-80">
              {oauthCallbackUrl}
            </code>
          </div>
        )}
      </div>
    );
  }

  if (loadingPatient || !patient) {
    return (
      <p className="flex h-full items-center justify-center gap-2 text-sm text-teal-900/60">
        <Loader2 className="size-4 animate-spin" /> Cargando ficha…
      </p>
    );
  }

  if (!profileComplete) {
    return (
      <PatientProfileForm
        patient={patient}
        onSaved={(p) => {
          setPatient(p);
          setProfileComplete(true);
        }}
      />
    );
  }

  const canConfirm = Boolean(date && startTime);

  return (
    <form onSubmit={onSubmit} className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-teal-900/10 bg-gradient-to-br from-white via-white to-teal-50/40">
        <div className="grid min-h-0 flex-1 lg:grid-cols-2">
          <section className="min-h-0 overflow-y-auto border-b border-teal-900/8 p-3 sm:p-4 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-teal-800 text-xs font-semibold text-white">
                1
              </span>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-lg tracking-tight text-teal-950">
                  Elegí el día
                </h2>
                <p className="text-[0.65rem] text-teal-800/55">
                  Solo días con horario libre
                </p>
              </div>
            </div>

            {dates.length === 0 ? (
              <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 text-center text-sm text-teal-900/55">
                <CalendarDays className="size-7 opacity-40" />
                <p>No hay días disponibles por ahora.</p>
              </div>
            ) : (
              <AvailabilityCalendar
                availableDates={dates}
                selectedDate={date}
                onSelect={setDate}
              />
            )}
          </section>

          <section className="flex min-h-0 flex-col p-3 sm:p-4">
            <div className="mb-3 flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition",
                  date
                    ? "bg-teal-800 text-white"
                    : "bg-teal-800/10 text-teal-800/50",
                )}
              >
                2
              </span>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-lg tracking-tight text-teal-950">
                  Elegí el horario
                </h2>
                <p className="text-[0.65rem] capitalize text-teal-800/55">
                  {date ? formatLongDate(date) : "Esperando el día"}
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {!date ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-teal-900/12 bg-teal-50/30 px-4 py-6 text-center">
                  <Clock3 className="size-6 text-teal-800/35" />
                  <p className="max-w-[16rem] text-sm text-teal-900/55">
                    Seleccioná un día para ver horarios libres.
                  </p>
                </div>
              ) : loadingSlots ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-teal-900/60">
                  <Loader2 className="size-4 animate-spin" /> Cargando horarios…
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm text-teal-900/55">
                  Sin horarios libres ese día.
                </div>
              ) : (
                <div className="grid grid-cols-3 content-start gap-1.5 sm:grid-cols-4">
                  {slots.map((slot) => {
                    const selected = startTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setStartTime(slot)}
                        className={cn(
                          "rounded-lg border px-2 py-2 text-sm transition-all duration-200",
                          selected
                            ? "border-teal-800 bg-teal-800 text-white shadow-[0_10px_24px_-14px_rgba(17,94,89,0.95)]"
                            : "border-teal-900/10 bg-white/80 text-teal-950 hover:border-teal-700/30 hover:bg-teal-50",
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-teal-900/8 bg-white/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p className="truncate text-sm text-teal-900/60">
            {canConfirm ? (
              <>
                <span className="font-medium capitalize text-teal-950">
                  {formatLongDate(date)}
                </span>
                <span>
                  {" "}
                  · {startTime} hs · {clinic.doctorName}
                </span>
              </>
            ) : (
              "Completá día y horario para confirmar"
            )}
          </p>
          <Button
            type="submit"
            disabled={pending || !canConfirm}
            className="bg-teal-800 hover:bg-teal-900 sm:min-w-[10.5rem]"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Reservando…
              </>
            ) : (
              "Confirmar turno"
            )}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </form>
  );
}
