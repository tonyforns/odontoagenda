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
  selectedDate: string;
  markedDates?: string[];
  onSelect: (date: string) => void;
  className?: string;
};

export function MiniMonthCalendar({
  selectedDate,
  markedDates = [],
  onSelect,
  className,
}: Props) {
  const marked = useMemo(() => new Set(markedDates), [markedDates]);
  const [month, setMonth] = useState(() =>
    startOfMonth(parse(selectedDate, "yyyy-MM-dd", new Date())),
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <div className={cn("w-[17.5rem]", className)}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          aria-label="Mes anterior"
          className="flex size-7 items-center justify-center rounded-full text-teal-800 transition hover:bg-teal-800/8"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="font-[family-name:var(--font-display)] text-sm capitalize text-teal-950">
          {format(month, "MMMM yyyy", { locale: es })}
        </p>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          aria-label="Mes siguiente"
          className="flex size-7 items-center justify-center rounded-full text-teal-800 transition hover:bg-teal-800/8"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mb-0.5 grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-teal-800/45"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const isSelected = selectedDate === key;
          const hasMark = marked.has(key);

          return (
            <div key={key} className="flex justify-center py-0.5">
              <button
                type="button"
                disabled={!inMonth}
                onClick={() => onSelect(key)}
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full text-sm transition",
                  !inMonth && "pointer-events-none opacity-0",
                  inMonth &&
                    !isSelected &&
                    "text-teal-950 hover:bg-teal-800/10",
                  isSelected && "bg-teal-800 text-white",
                )}
                aria-label={`Elegir ${format(day, "d 'de' MMMM", { locale: es })}`}
                aria-pressed={isSelected}
              >
                <span className={cn(hasMark && !isSelected && "font-medium")}>
                  {format(day, "d")}
                </span>
                {hasMark && !isSelected ? (
                  <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-teal-600/80" />
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
