"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

type Props = {
  availableDates: string[];
  selectedDate: string;
  onSelect: (date: string) => void;
  className?: string;
};

export function AvailabilityCalendar({
  availableDates,
  selectedDate,
  onSelect,
  className,
}: Props) {
  const available = useMemo(() => new Set(availableDates), [availableDates]);
  const firstAvailable = availableDates[0];
  const [month, setMonth] = useState(() =>
    startOfMonth(
      firstAvailable
        ? parse(firstAvailable, "yyyy-MM-dd", new Date())
        : new Date(),
    ),
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const canGoPrev = useMemo(() => {
    if (!availableDates.length) return false;
    const prevEnd = endOfMonth(addMonths(month, -1));
    return availableDates.some(
      (d) => parse(d, "yyyy-MM-dd", new Date()) <= prevEnd,
    );
  }, [availableDates, month]);

  const canGoNext = useMemo(() => {
    if (!availableDates.length) return false;
    const nextStart = startOfMonth(addMonths(month, 1));
    return availableDates.some(
      (d) => parse(d, "yyyy-MM-dd", new Date()) >= nextStart,
    );
  }, [availableDates, month]);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => setMonth((m) => addMonths(m, -1))}
          aria-label="Mes anterior"
          className="flex size-9 items-center justify-center rounded-full text-teal-800 transition hover:bg-teal-800/8 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="font-[family-name:var(--font-display)] text-[1.05rem] capitalize tracking-tight text-teal-950">
          {format(month, "MMMM yyyy", { locale: es })}
        </p>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => setMonth((m) => addMonths(m, 1))}
          aria-label="Mes siguiente"
          className="flex size-9 items-center justify-center rounded-full text-teal-800 transition hover:bg-teal-800/8 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-teal-800/45"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const isAvailable = available.has(key);
          const isSelected = selectedDate === key;

          return (
            <div key={key} className="flex justify-center py-0.5">
              <button
                type="button"
                disabled={!isAvailable}
                onClick={() => onSelect(key)}
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-full text-sm transition-all duration-200",
                  !inMonth && "opacity-0 pointer-events-none",
                  inMonth &&
                    !isAvailable &&
                    "cursor-default text-teal-900/20",
                  isAvailable &&
                    !isSelected &&
                    "text-teal-950 hover:bg-teal-800/10",
                  isSelected &&
                    "bg-teal-800 text-white shadow-[0_8px_20px_-10px_rgba(17,94,89,0.9)] scale-[1.04]",
                )}
                aria-label={
                  isAvailable
                    ? `Elegir ${format(day, "d 'de' MMMM", { locale: es })}`
                    : undefined
                }
                aria-pressed={isSelected}
              >
                <span className={cn(isAvailable && !isSelected && "font-medium")}>
                  {format(day, "d")}
                </span>
                {isAvailable && !isSelected ? (
                  <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-teal-600/80" />
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
