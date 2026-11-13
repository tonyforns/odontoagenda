"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  LogIn,
} from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Appointment } from "@/lib/types";
import { googleCalendarAddUrl } from "@/lib/patient-calendar";
import {
  appointmentDayTone,
  groupAppointmentsByDate,
  initialAppointmentDate,
} from "@/lib/patient-appointments";
import { isClinicDatePast, isSlotBookable } from "@/lib/slots";
import { cn } from "@/lib/utils";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function formatLongDate(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "EEEE d 'de' MMMM", {
    locale: es,
  });
}

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
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
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const byDate = useMemo(
    () => groupAppointmentsByDate(appointments),
    [appointments],
  );

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const dayAppointments = byDate.get(selectedDate) ?? [];
  const rescheduleTarget = appointments.find((a) => a.id === rescheduleId);

  useEffect(() => {
    if (!rescheduleId) {
      setDates([]);
      return;
    }
    const qs = new URLSearchParams({ excludeAppointmentId: rescheduleId });
    fetch(`/api/availability?${qs}`)
      .then((r) => r.json())
      .then((data) => setDates(data.dates ?? []))
      .catch(() => setDates([]));
  }, [rescheduleId]);

  useEffect(() => {
    if (!newDate || !rescheduleId) {
      setSlots([]);
      setNewTime("");
      return;
    }
    setLoadingSlots(true);
    const qs = new URLSearchParams({
      date: newDate,
      excludeAppointmentId: rescheduleId,
    });
    fetch(`/api/availability?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots ?? []);
        setNewTime("");
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
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
        const list = (data.appointments ?? []) as Appointment[];
        setAppointments(list);
        const initial = initialAppointmentDate(list, todayIso());
        if (initial) {
          setSelectedDate(initial);
          setMonth(startOfMonth(parse(initial, "yyyy-MM-dd", new Date())));
        }
        setLoaded(true);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoaded(true);
      });
  }, [status]);

  function startReschedule(appointment: Appointment) {
    setError(null);
    setMessage(null);
    setRescheduleId(appointment.id);
    setNewDate("");
    setNewTime("");
    setSlots([]);
  }

  function cancelReschedule() {
    setRescheduleId(null);
    setNewDate("");
    setNewTime("");
    setSlots([]);
  }

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

  function confirmReschedule() {
    if (!rescheduleTarget || !newDate || !newTime) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/appointments/${rescheduleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manageToken: rescheduleTarget.manageToken,
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
      const updated = data.appointment as Appointment;
      setAppointments((prev) =>
        prev.map((a) => (a.id === rescheduleTarget.id ? updated : a)),
      );
      cancelReschedule();
      setSelectedDate(updated.date);
      setMonth(startOfMonth(parse(updated.date, "yyyy-MM-dd", new Date())));
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

  if (!loaded) {
    return (
      <p className="flex items-center gap-2 text-sm text-teal-900/70">
        <Loader2 className="size-4 animate-spin" /> Buscando turnos…
      </p>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="space-y-3">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <p className="text-sm text-teal-900/70">No tenés turnos registrados.</p>
      </div>
    );
  }

  if (rescheduleTarget) {
    const canConfirm = Boolean(newDate && newTime);
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        {error ? (
          <p className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-teal-900/10 bg-gradient-to-br from-white via-white to-teal-50/40">
          <div className="shrink-0 border-b border-teal-900/8 px-3 py-2.5 sm:px-4">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-teal-800/55">
              Reprogramar turno
            </p>
            <p className="text-sm capitalize text-teal-950">
              Actual: {formatLongDate(rescheduleTarget.date)} ·{" "}
              {rescheduleTarget.startTime} hs
            </p>
          </div>

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
                  selectedDate={newDate}
                  onSelect={setNewDate}
                />
              )}
            </section>

            <section className="flex min-h-0 flex-col p-3 sm:p-4">
              <div className="mb-3 flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition",
                    newDate
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
                    {newDate ? formatLongDate(newDate) : "Esperando el día"}
                  </p>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {!newDate ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-teal-900/12 bg-teal-50/30 px-4 py-6 text-center">
                    <Clock3 className="size-6 text-teal-800/35" />
                    <p className="max-w-[16rem] text-sm text-teal-900/55">
                      Seleccioná un día para ver horarios libres.
                    </p>
                  </div>
                ) : loadingSlots ? (
                  <div className="flex flex-1 items-center justify-center gap-2 text-sm text-teal-900/60">
                    <Loader2 className="size-4 animate-spin" /> Cargando
                    horarios…
                  </div>
                ) : slots.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-teal-900/55">
                    Sin horarios libres ese día.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 content-start gap-1.5 sm:grid-cols-4">
                    {slots.map((slot) => {
                      const selected = newTime === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setNewTime(slot)}
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
                    {formatLongDate(newDate)}
                  </span>
                  <span> · {newTime} hs</span>
                </>
              ) : (
                "Completá día y horario para confirmar"
              )}
            </p>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={cancelReschedule}
              >
                Volver
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending || !canConfirm}
                className="bg-teal-800 hover:bg-teal-900 sm:min-w-[10.5rem]"
                onClick={confirmReschedule}
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Guardando…
                  </>
                ) : (
                  "Confirmar cambio"
                )}
              </Button>
            </div>
          </div>
        </div>
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

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:overflow-hidden">
        <section className="flex min-h-0 flex-col rounded-xl border border-teal-900/10 bg-white/90 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              aria-label="Mes anterior"
              className="flex size-8 items-center justify-center rounded-full text-teal-800 transition hover:bg-teal-800/8"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="font-[family-name:var(--font-display)] text-base capitalize text-teal-950 sm:text-lg">
              {format(month, "MMMM yyyy", { locale: es })}
            </p>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label="Mes siguiente"
              className="flex size-8 items-center justify-center rounded-full text-teal-800 transition hover:bg-teal-800/8"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-teal-800/45"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const dayList = byDate.get(iso) ?? [];
              const tone = appointmentDayTone(dayList);
              const datePast = isClinicDatePast(iso);
              const disabledDay = datePast && dayList.length === 0;
              const selected = iso === selectedDate;
              const inMonth = isSameMonth(day, month);
              const confirmedCount = dayList.filter(
                (a) => a.status === "confirmed",
              ).length;

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => {
                    if (datePast && dayList.length === 0) return;
                    setSelectedDate(iso);
                  }}
                  className={cn(
                    "relative flex min-h-[3.25rem] flex-col items-center rounded-lg px-0.5 py-1.5 text-sm transition sm:min-h-[4rem]",
                    inMonth ? "text-teal-950" : "text-teal-900/30",
                    disabledDay || (datePast && !selected)
                      ? "cursor-not-allowed opacity-35"
                      : null,
                    selected
                      ? "bg-teal-800 text-white shadow-sm opacity-100"
                      : !datePast && tone === "confirmed"
                        ? "bg-teal-800/10 hover:bg-teal-800/15"
                        : !datePast && tone === "mixed"
                          ? "bg-teal-800/8 hover:bg-teal-800/12"
                          : !datePast && tone === "cancelled"
                            ? "bg-stone-100 hover:bg-stone-200/80"
                            : !datePast
                              ? "hover:bg-teal-800/5"
                              : null,
                    isToday(day) && !selected
                      ? "ring-1 ring-teal-700/35"
                      : null,
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium sm:text-sm",
                      selected ? "text-white" : null,
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayList.length > 0 ? (
                    <div className="mt-1 flex flex-col items-center gap-0.5">
                      {confirmedCount > 0 ? (
                        <span
                          className={cn(
                            "rounded px-1 text-[9px] font-semibold leading-tight sm:text-[10px]",
                            selected
                              ? "bg-white/20 text-white"
                              : "bg-teal-800 text-white",
                          )}
                        >
                          {dayList
                            .filter((a) => a.status === "confirmed")
                            .map((a) => a.startTime)
                            .slice(0, 2)
                            .join(" · ")}
                          {confirmedCount > 2 ? "…" : ""}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            selected ? "bg-white/70" : "bg-stone-400",
                          )}
                        />
                      )}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 border-t border-teal-900/10 pt-3 text-[11px] text-teal-900/55">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-teal-800/15 ring-1 ring-teal-800/20" />
              Con turno
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-stone-200" />
              Solo cancelado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm ring-1 ring-teal-700/35" />
              Hoy
            </span>
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border border-teal-900/10 bg-white/90 p-3 sm:p-4 lg:overflow-y-auto">
          <div className="mb-3 shrink-0">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-teal-800/55">
              Día seleccionado
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-lg capitalize text-teal-950">
              {formatLongDate(selectedDate)}
            </h2>
          </div>

          {dayAppointments.length === 0 ? (
            <p className="text-sm text-teal-900/60">
              No hay turnos este día. Elegí un día marcado en el calendario.
            </p>
          ) : (
            <ul className="space-y-3">
              {dayAppointments.map((a) => {
                const slotPast = !isSlotBookable(a.date, a.startTime);
                const canManage = a.status === "confirmed" && !slotPast;
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-xl border border-teal-900/10 bg-teal-50/40 p-3 sm:p-4",
                      slotPast && "opacity-70",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-teal-950">
                          {a.startTime} hs
                          <span className="text-teal-900/60">
                            {" "}
                            ({a.durationMinutes} min)
                          </span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge
                            variant={
                              a.status === "confirmed" ? "default" : "secondary"
                            }
                          >
                            {a.status === "confirmed"
                              ? "Confirmado"
                              : "Cancelado"}
                          </Badge>
                          {slotPast ? (
                            <Badge variant="secondary">Pasado</Badge>
                          ) : null}
                        </div>
                      </div>
                      {canManage ? (
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
                            onClick={() => startReschedule(a)}
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
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
