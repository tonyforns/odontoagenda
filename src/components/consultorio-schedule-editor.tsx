"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { clinic } from "@/lib/clinic";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WEEKDAY_OPTIONS,
  availableEndTimes,
  availableStartTimes,
  ensureTimeOption,
  validateScheduleWindows,
  type ScheduleWindowInput,
} from "@/lib/schedule-rules";
import type { DoctorScheduleWindow } from "@/lib/types";
import { cn } from "@/lib/utils";

type DayDraft = {
  enabled: boolean;
  windows: Array<{ startTime: string; endTime: string }>;
};

function emptyDay(): DayDraft {
  return { enabled: false, windows: [] };
}

function draftsFromWindows(windows: DoctorScheduleWindow[]): DayDraft[] {
  const drafts = WEEKDAY_OPTIONS.map(() => emptyDay());
  for (const option of WEEKDAY_OPTIONS) {
    const dayWindows = windows
      .filter((w) => w.weekday === option.value)
      .map((w) => ({ startTime: w.startTime, endTime: w.endTime }));
    const index = WEEKDAY_OPTIONS.findIndex((d) => d.value === option.value);
    drafts[index] = {
      enabled: dayWindows.length > 0,
      windows:
        dayWindows.length > 0
          ? dayWindows
          : [{ startTime: "09:00", endTime: "12:00" }],
    };
  }
  return drafts;
}

function windowsFromDrafts(drafts: DayDraft[]): ScheduleWindowInput[] {
  const windows: ScheduleWindowInput[] = [];
  WEEKDAY_OPTIONS.forEach((day, index) => {
    const draft = drafts[index];
    if (!draft?.enabled) return;
    for (const window of draft.windows) {
      windows.push({
        weekday: day.value,
        startTime: window.startTime,
        endTime: window.endTime,
      });
    }
  });
  return windows;
}

function firstFreeWindow(
  existing: Array<{ startTime: string; endTime: string }>,
): { startTime: string; endTime: string } {
  const candidates = [
    { startTime: "09:00", endTime: "12:00" },
    { startTime: "15:00", endTime: "18:00" },
    { startTime: "12:00", endTime: "15:00" },
  ];
  for (const candidate of candidates) {
    const okStart = availableStartTimes({
      endTime: candidate.endTime,
      otherWindows: existing,
      stepMinutes: clinic.slotMinutes,
    }).includes(candidate.startTime);
    if (okStart) return candidate;
  }
  const endOptions = availableEndTimes({
    startTime: "08:00",
    otherWindows: existing,
    stepMinutes: clinic.slotMinutes,
  });
  if (endOptions[0]) {
    return { startTime: "08:00", endTime: endOptions[0] };
  }
  return { startTime: "09:00", endTime: "12:00" };
}

export function ConsultorioScheduleEditor() {
  const [drafts, setDrafts] = useState<DayDraft[]>(() =>
    WEEKDAY_OPTIONS.map(() => emptyDay()),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  const draftWindows = useMemo(() => windowsFromDrafts(drafts), [drafts]);
  const validationError = useMemo(
    () => validateScheduleWindows(draftWindows),
    [draftWindows],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/schedule");
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar el horario.");
        setLoaded(true);
        return;
      }
      setDrafts(draftsFromWindows(data.windows ?? []));
      setError(null);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateDay(index: number, patch: Partial<DayDraft>) {
    setSaved(false);
    setError(null);
    setDrafts((prev) =>
      prev.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    );
  }

  function updateWindow(
    dayIndex: number,
    windowIndex: number,
    patch: Partial<{ startTime: string; endTime: string }>,
  ) {
    setSaved(false);
    setError(null);
    setDrafts((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        return {
          ...day,
          windows: day.windows.map((window, j) => {
            if (j !== windowIndex) return window;
            const next = { ...window, ...patch };
            if (patch.startTime) {
              const others = day.windows.filter((_, k) => k !== windowIndex);
              const ends = availableEndTimes({
                startTime: next.startTime,
                otherWindows: others,
                stepMinutes: clinic.slotMinutes,
              });
              if (!ends.includes(next.endTime)) {
                next.endTime = ends[0] ?? next.endTime;
              }
            }
            return next;
          }),
        };
      }),
    );
  }

  function addWindow(dayIndex: number) {
    setSaved(false);
    setError(null);
    setDrafts((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        return {
          ...day,
          enabled: true,
          windows: [...day.windows, firstFreeWindow(day.windows)],
        };
      }),
    );
  }

  function removeWindow(dayIndex: number, windowIndex: number) {
    setSaved(false);
    setError(null);
    setDrafts((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        const windows = day.windows.filter((_, j) => j !== windowIndex);
        return {
          enabled: windows.length > 0 ? day.enabled : false,
          windows:
            windows.length > 0
              ? windows
              : [{ startTime: "09:00", endTime: "12:00" }],
        };
      }),
    );
  }

  function save() {
    const localError = validateScheduleWindows(windowsFromDrafts(drafts));
    if (localError) {
      setError(localError);
      setSaved(false);
      return;
    }

    startTransition(async () => {
      setError(null);
      setSaved(false);
      const windows = windowsFromDrafts(drafts);
      const res = await fetch("/api/admin/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.");
        return;
      }
      setDrafts(draftsFromWindows(data.windows ?? []));
      setSaved(true);
    });
  }

  if (!loaded) {
    return (
      <p className="flex h-full items-center justify-center gap-2 text-sm text-teal-900/70">
        <Loader2 className="size-4 animate-spin" /> Cargando horarios…
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg text-teal-950">
            Horarios de atención
          </h2>
          <p className="text-xs text-teal-900/55">
            Definí por día las franjas en las que se pueden reservar turnos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved ? (
            <span className="text-xs text-teal-800/80">Guardado</span>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="bg-teal-800 hover:bg-teal-900"
            disabled={pending || Boolean(validationError)}
            onClick={save}
          >
            {pending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Guardando…
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      </div>

      {error || validationError ? (
        <p className="text-sm text-red-700">{error ?? validationError}</p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {WEEKDAY_OPTIONS.map((day, dayIndex) => {
            const draft = drafts[dayIndex] ?? emptyDay();
            return (
              <section
                key={day.value}
                className={cn(
                  "rounded-xl border border-teal-900/10 bg-white/90 p-3",
                  !draft.enabled && "opacity-75",
                )}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-teal-950">
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      className="size-4 rounded border-teal-900/30 accent-teal-800"
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        updateDay(dayIndex, {
                          enabled,
                          windows:
                            enabled && draft.windows.length === 0
                              ? [{ startTime: "09:00", endTime: "12:00" }]
                              : draft.windows,
                        });
                      }}
                    />
                    {day.label}
                  </label>
                  {draft.enabled ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-teal-800"
                      onClick={() => addWindow(dayIndex)}
                    >
                      <Plus className="size-3.5" /> Franja
                    </Button>
                  ) : (
                    <span className="text-xs text-teal-900/45">Cerrado</span>
                  )}
                </div>

                {draft.enabled ? (
                  <div className="space-y-2">
                    {draft.windows.map((window, windowIndex) => {
                      const others = draft.windows.filter(
                        (_, i) => i !== windowIndex,
                      );
                      const startOptions = ensureTimeOption(
                        availableStartTimes({
                          endTime: window.endTime,
                          otherWindows: others,
                          stepMinutes: clinic.slotMinutes,
                        }),
                        window.startTime,
                      );
                      const endOptions = ensureTimeOption(
                        availableEndTimes({
                          startTime: window.startTime,
                          otherWindows: others,
                          stepMinutes: clinic.slotMinutes,
                        }),
                        window.endTime,
                      );

                      return (
                        <div
                          key={`${day.value}-${windowIndex}`}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <Select
                            value={window.startTime}
                            onValueChange={(value) =>
                              updateWindow(dayIndex, windowIndex, {
                                startTime: value,
                              })
                            }
                          >
                            <SelectTrigger
                              size="sm"
                              className="w-[6.75rem]"
                              aria-label={`Inicio ${day.label}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper" align="start">
                              {startOptions.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-xs text-teal-900/45">a</span>
                          <Select
                            value={window.endTime}
                            onValueChange={(value) =>
                              updateWindow(dayIndex, windowIndex, {
                                endTime: value,
                              })
                            }
                          >
                            <SelectTrigger
                              size="sm"
                              className="w-[6.75rem]"
                              aria-label={`Fin ${day.label}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper" align="start">
                              {endOptions.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="text-teal-900/50 hover:text-red-700"
                            aria-label="Quitar franja"
                            disabled={draft.windows.length <= 1}
                            onClick={() =>
                              removeWindow(dayIndex, windowIndex)
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
