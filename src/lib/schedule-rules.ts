import type { DoctorWindow } from "@/lib/types";

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
] as const;

export type ScheduleWindowInput = {
  weekday: number;
  startTime: string;
  endTime: string;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Opciones HH:mm para dropdowns de franja (default 06:00–22:00 cada 30'). */
export function buildTimeOptions(
  stepMinutes = 30,
  from = "06:00",
  to = "22:00",
): string[] {
  const start = toMinutes(from);
  const end = toMinutes(to);
  const options: string[] = [];
  for (let t = start; t <= end; t += stepMinutes) {
    options.push(fromMinutes(t));
  }
  return options;
}

export function windowsOverlap(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string },
): boolean {
  return (
    toMinutes(a.startTime) < toMinutes(b.endTime) &&
    toMinutes(b.startTime) < toMinutes(a.endTime)
  );
}

type DayWindow = { startTime: string; endTime: string };

/** Inicios válidos: anteriores al fin y sin solapar otras franjas. */
export function availableStartTimes(input: {
  endTime: string;
  otherWindows: DayWindow[];
  stepMinutes?: number;
}): string[] {
  const { endTime, otherWindows, stepMinutes = 30 } = input;
  const endMin = toMinutes(endTime);
  return buildTimeOptions(stepMinutes).filter((startTime) => {
    if (toMinutes(startTime) >= endMin) return false;
    const candidate = { startTime, endTime };
    return !otherWindows.some((other) => windowsOverlap(candidate, other));
  });
}

/** Fines válidos: posteriores al inicio y sin solapar otras franjas. */
export function availableEndTimes(input: {
  startTime: string;
  otherWindows: DayWindow[];
  stepMinutes?: number;
}): string[] {
  const { startTime, otherWindows, stepMinutes = 30 } = input;
  const startMin = toMinutes(startTime);
  return buildTimeOptions(stepMinutes).filter((endTime) => {
    if (toMinutes(endTime) <= startMin) return false;
    const candidate = { startTime, endTime };
    return !otherWindows.some((other) => windowsOverlap(candidate, other));
  });
}

/** Incluye el valor actual aunque esté fuera de la grilla (datos legacy). */
export function ensureTimeOption(options: string[], current: string): string[] {
  if (!current || options.includes(current)) return options;
  return [...options, current].sort((a, b) => a.localeCompare(b));
}

function weekdayLabel(weekday: number): string {
  return (
    WEEKDAY_OPTIONS.find((d) => d.value === weekday)?.label ?? `día ${weekday}`
  );
}

export function isInvertedWindow(window: {
  startTime: string;
  endTime: string;
}): boolean {
  if (!window.startTime || !window.endTime) return false;
  return toMinutes(window.startTime) >= toMinutes(window.endTime);
}

/** Detecta franjas con inicio ≥ fin. */
export function findInvertedWindows(
  windows: ScheduleWindowInput[],
): string | null {
  for (const window of windows) {
    if (isInvertedWindow(window)) {
      return `Franja invertida el ${weekdayLabel(window.weekday)} (${window.startTime}–${window.endTime}): el fin debe ser posterior al inicio.`;
    }
  }
  return null;
}

/** Detecta solapes en las franjas de un mismo weekday. */
export function findOverlappingWindows(
  windows: ScheduleWindowInput[],
): string | null {
  const byDay = new Map<number, ScheduleWindowInput[]>();
  for (const window of windows) {
    const list = byDay.get(window.weekday) ?? [];
    list.push(window);
    byDay.set(window.weekday, list);
  }

  for (const [weekday, list] of byDay) {
    const sorted = [...list].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (toMinutes(curr.startTime) < toMinutes(prev.endTime)) {
        return `Franjas solapadas el ${weekdayLabel(weekday)} (${prev.startTime}–${prev.endTime} y ${curr.startTime}–${curr.endTime}).`;
      }
    }
  }
  return null;
}

/** Valida invertidas y solapes (en ese orden). */
export function validateScheduleWindows(
  windows: ScheduleWindowInput[],
): string | null {
  return findInvertedWindows(windows) ?? findOverlappingWindows(windows);
}

/** Índices de franja (en el draft del día) que están invertidas o solapadas. */
export function invalidWindowIndexesForDay(
  windows: Array<{ startTime: string; endTime: string }>,
): Set<number> {
  const invalid = new Set<number>();
  windows.forEach((window, index) => {
    if (isInvertedWindow(window)) invalid.add(index);
  });

  const order = windows
    .map((window, index) => ({ window, index }))
    .sort((a, b) => a.window.startTime.localeCompare(b.window.startTime));

  for (let i = 1; i < order.length; i++) {
    const prev = order[i - 1];
    const curr = order[i];
    if (
      !isInvertedWindow(prev.window) &&
      !isInvertedWindow(curr.window) &&
      toMinutes(curr.window.startTime) < toMinutes(prev.window.endTime)
    ) {
      invalid.add(prev.index);
      invalid.add(curr.index);
    }
  }
  return invalid;
}

export function legacyWindowsFromSchedule(
  windows: ScheduleWindowInput[],
): DoctorWindow[] {
  const map = new Map<string, DoctorWindow>();
  for (const window of windows) {
    const key = `${window.startTime}-${window.endTime}`;
    map.set(key, { start: window.startTime, end: window.endTime });
  }
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
}

export function workDaysFromWindowInputs(
  windows: ScheduleWindowInput[],
): number[] {
  return [...new Set(windows.map((w) => w.weekday))].sort((a, b) => a - b);
}
