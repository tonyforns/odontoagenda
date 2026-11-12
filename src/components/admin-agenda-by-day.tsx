"use client";

import { format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Appointment } from "@/lib/types";
import {
  buildDaySchedule,
  buildWeekDayAgenda,
  countTakenSlots,
  formatAgendaDayChip,
  formatAgendaDayLabel,
  formatWeekRangeLabel,
  groupDayScheduleByPeriod,
  initialWeekStart,
  shiftWeek,
  weekStartFromDate,
} from "@/lib/agenda";
import { patientDisplayName } from "@/lib/patient-utils";
import { MiniMonthCalendar } from "@/components/mini-month-calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  appointments: Appointment[];
  onSelectPatient: (patientId: string) => void;
  onSelectFreeSlot: (slot: {
    date: string;
    startTime: string;
    endTime: string;
  }) => void;
};

export function AdminAgendaByDay({
  appointments,
  onSelectPatient,
  onSelectFreeSlot,
}: Props) {
  const [weekStart, setWeekStart] = useState(() =>
    initialWeekStart(appointments),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const weekDays = useMemo(
    () => buildWeekDayAgenda(weekStart, appointments),
    [weekStart, appointments],
  );

  const markedDates = useMemo(
    () =>
      [
        ...new Set(
          appointments
            .filter((a) => a.status === "confirmed")
            .map((a) => a.date),
        ),
      ],
    [appointments],
  );

  const activeDate =
    selectedDate && weekDays.some((d) => d.date === selectedDate)
      ? selectedDate
      : (weekDays.find((d) => d.appointments.length > 0)?.date ??
        weekDays[0]?.date ??
        null);

  const activeDay = weekDays.find((d) => d.date === activeDate) ?? null;
  const daySchedule = useMemo(
    () =>
      activeDate
        ? buildDaySchedule(activeDate, appointments)
        : [],
    [activeDate, appointments],
  );
  const dayPeriods = useMemo(
    () => groupDayScheduleByPeriod(daySchedule),
    [daySchedule],
  );
  const takenCount = countTakenSlots(daySchedule);
  const calendarSelected =
    activeDate ?? format(weekStart, "yyyy-MM-dd");

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildDaySchedule>>();
    for (const day of weekDays) {
      map.set(day.date, buildDaySchedule(day.date, appointments));
    }
    return map;
  }, [weekDays, appointments]);

  useEffect(() => {
    if (!calendarOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setCalendarOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCalendarOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [calendarOpen]);

  function jumpToDate(date: string) {
    setWeekStart(weekStartFromDate(date));
    setSelectedDate(date);
    setCalendarOpen(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="relative flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-8 text-teal-800"
          aria-label="Semana anterior"
          onClick={() => {
            setWeekStart((w) => shiftWeek(w, -1));
            setSelectedDate(null);
            setCalendarOpen(false);
          }}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          <p className="truncate text-sm font-medium capitalize text-teal-950">
            {formatWeekRangeLabel(weekStart)}
          </p>
          <div className="relative" ref={calendarRef}>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={cn(
                "size-8 text-teal-800",
                calendarOpen && "bg-teal-800/10",
              )}
              aria-label="Abrir calendario"
              aria-expanded={calendarOpen}
              onClick={() => setCalendarOpen((open) => !open)}
            >
              <CalendarDays className="size-4" />
            </Button>
            {calendarOpen ? (
              <div className="absolute top-full left-1/2 z-30 mt-2 -translate-x-1/2 rounded-xl border border-teal-900/10 bg-white p-3 shadow-lg">
                <MiniMonthCalendar
                  selectedDate={calendarSelected}
                  markedDates={markedDates}
                  onSelect={jumpToDate}
                />
              </div>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-8 text-teal-800"
          aria-label="Semana siguiente"
          onClick={() => {
            setWeekStart((w) => shiftWeek(w, 1));
            setSelectedDate(null);
            setCalendarOpen(false);
          }}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex shrink-0 gap-1.5">
        {weekDays.map((day) => {
          const selected = day.date === activeDate;
          const schedule = schedulesByDate.get(day.date) ?? [];
          const taken = countTakenSlots(schedule);
          const total = schedule.length;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(day.date)}
              className={cn(
                "min-w-0 flex-1 rounded-xl border px-1.5 py-1.5 text-left transition sm:px-2.5",
                selected
                  ? "border-teal-800 bg-teal-800 text-white shadow-sm"
                  : "border-teal-900/10 bg-white/90 text-teal-950 hover:border-teal-800/30 hover:bg-teal-50/80",
              )}
            >
              <p
                className={cn(
                  "text-[0.65rem] font-medium uppercase tracking-[0.06em]",
                  selected ? "text-white/70" : "text-teal-900/50",
                )}
              >
                {formatAgendaDayChip(day.date)}
              </p>
              <p className="font-[family-name:var(--font-display)] text-base leading-tight tabular-nums">
                {day.date.slice(8)}/{day.date.slice(5, 7)}
              </p>
              <p
                className={cn(
                  "text-[0.65rem]",
                  selected ? "text-white/75" : "text-teal-900/55",
                )}
              >
                {taken}/{total}
              </p>
            </button>
          );
        })}
      </div>

      {activeDay ? (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-teal-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(238,247,245,0.9))]">
          <header className="flex shrink-0 items-baseline justify-between gap-2 border-b border-teal-900/8 px-3 py-1.5">
            <h2 className="truncate font-[family-name:var(--font-display)] text-base capitalize text-teal-950">
              {formatAgendaDayLabel(activeDay.date)}
            </h2>
            <p className="shrink-0 text-xs text-teal-900/55">
              {takenCount} tomados · {daySchedule.length - takenCount} libres
            </p>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3 sm:px-4">
            {dayPeriods.map((period) => (
              <div key={period.period}>
                <p className="mb-2 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-teal-800/55">
                  {period.label}
                </p>
                <ol className="relative space-y-2 border-l border-teal-800/15 pl-4">
                  {period.slots.map((slot) => {
                    const taken = slot.status === "taken";
                    const appointment = slot.appointment;
                    const meta = taken
                      ? [
                          appointment?.patient?.dni
                            ? `DNI ${appointment.patient.dni}`
                            : null,
                          appointment?.patient?.obraSocial ?? null,
                          appointment?.patient?.phone ?? null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Turno libre";
                    const title =
                      taken && appointment?.patient
                        ? patientDisplayName(appointment.patient)
                        : taken
                          ? "Paciente"
                          : "Disponible";

                    const rowClass = cn(
                      "group grid h-[4.25rem] w-full grid-cols-[3.4rem_minmax(0,1fr)_4.25rem] items-center gap-2 rounded-xl p-2 text-left transition sm:gap-3 sm:p-2.5",
                      taken
                        ? "border border-teal-900/10 bg-white/95 shadow-[0_1px_0_rgba(15,47,44,0.04)] hover:border-teal-800/20 hover:bg-white hover:shadow-sm"
                        : "border border-dashed border-teal-900/12 bg-white/55 hover:border-teal-700/30 hover:bg-emerald-50/50",
                    );

                    const body = (
                      <>
                        <div
                          className={cn(
                            "flex h-full flex-col items-center justify-center rounded-lg px-1 text-center",
                            taken
                              ? "bg-teal-800/[0.08]"
                              : "bg-teal-900/[0.03]",
                          )}
                        >
                          <span className="font-[family-name:var(--font-display)] text-base leading-none tabular-nums text-teal-950">
                            {slot.startTime}
                          </span>
                          <span className="mt-1 text-[0.65rem] tabular-nums text-teal-900/45">
                            {slot.endTime}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate text-sm font-medium leading-5",
                              taken
                                ? "text-teal-950 transition group-hover:text-teal-800"
                                : "text-teal-900/45",
                            )}
                          >
                            {title}
                          </p>
                          <p className="mt-1 truncate text-[0.65rem] leading-4 text-teal-900/55">
                            {meta || "\u00A0"}
                          </p>
                        </div>
                        <div className="flex h-full items-center justify-end">
                          {taken ? (
                            <span className="text-[0.65rem] text-teal-800/50">
                              Ver ficha
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-800/80">
                              Asignar
                            </span>
                          )}
                        </div>
                      </>
                    );

                    return (
                      <li
                        key={`${slot.startTime}-${slot.status}`}
                        className="relative"
                      >
                        <span
                          className={cn(
                            "absolute top-[1.55rem] -left-[1.28rem] size-2.5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(17,94,89,0.2)]",
                            taken ? "bg-teal-700" : "bg-teal-200",
                          )}
                        />
                        {taken && appointment ? (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectPatient(appointment.patientId)
                            }
                            className={rowClass}
                          >
                            {body}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectFreeSlot({
                                date: activeDay.date,
                                startTime: slot.startTime,
                                endTime: slot.endTime,
                              })
                            }
                            className={rowClass}
                          >
                            {body}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
