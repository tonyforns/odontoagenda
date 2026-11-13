"use client";

import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Clock3, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Appointment } from "@/lib/types";
import { patientDisplayName } from "@/lib/patient-utils";
import { cn } from "@/lib/utils";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatLongDate(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "EEEE d 'de' MMMM", {
    locale: es,
  });
}

type Props = {
  appointment: Appointment | null;
  open: boolean;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (slot: { date: string; startTime: string }) => void;
};

export function RescheduleAppointmentConfirmDialog({
  appointment,
  open,
  pending = false,
  onOpenChange,
  onConfirm,
}: Props) {
  const [dates, setDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const patientName =
    appointment?.patient != null
      ? patientDisplayName(appointment.patient)
      : "el paciente";

  useEffect(() => {
    if (!open || !appointment) {
      setDates([]);
      setSlots([]);
      setDate("");
      setStartTime("");
      setLoadError(null);
      return;
    }

    setLoadingDates(true);
    setLoadError(null);
    const qs = new URLSearchParams({
      excludeAppointmentId: appointment.id,
    });
    fetch(`/api/availability?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDates(data.dates ?? []);
      })
      .catch((err: Error) => {
        setLoadError(err.message || "No se pudieron cargar las fechas.");
        setDates([]);
      })
      .finally(() => setLoadingDates(false));
  }, [open, appointment]);

  useEffect(() => {
    if (!open || !appointment || !date) {
      setSlots([]);
      setStartTime("");
      return;
    }

    setLoadingSlots(true);
    const qs = new URLSearchParams({
      date,
      excludeAppointmentId: appointment.id,
    });
    fetch(`/api/availability?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots ?? []);
        setStartTime("");
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [open, appointment, date]);

  const canConfirm = Boolean(date && startTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton={!pending}
      >
        <DialogHeader className="shrink-0 border-b border-teal-900/8 px-4 py-3 sm:px-5">
          <DialogTitle className="font-[family-name:var(--font-display)] text-xl text-teal-950">
            Reprogramar turno
          </DialogTitle>
          <DialogDescription>
            {appointment
              ? `${patientName} · actual ${formatLongDate(appointment.date)} ${appointment.startTime} hs. Elegí día y horario como al sacar turno.`
              : "Elegí día y horario nuevo."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
          <section className="min-h-0 overflow-y-auto border-b border-teal-900/8 p-4 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-teal-800 text-xs font-semibold text-white">
                1
              </span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-base tracking-tight text-teal-950">
                  Elegí el día
                </h3>
                <p className="text-[0.65rem] text-teal-800/55">
                  Solo días con horario libre
                </p>
              </div>
            </div>

            {loadingDates ? (
              <div className="flex min-h-[12rem] items-center justify-center gap-2 text-sm text-teal-900/60">
                <Loader2 className="size-4 animate-spin" /> Cargando días…
              </div>
            ) : loadError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {loadError}
              </p>
            ) : dates.length === 0 ? (
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

          <section className="flex min-h-0 flex-col p-4">
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
                <h3 className="font-[family-name:var(--font-display)] text-base tracking-tight text-teal-950">
                  Elegí el horario
                </h3>
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
                        disabled={pending}
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

        <div className="flex shrink-0 flex-col gap-2 border-t border-teal-900/8 bg-white/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="truncate text-sm text-teal-900/60">
            {canConfirm ? (
              <>
                <span className="font-medium capitalize text-teal-950">
                  {formatLongDate(date)}
                </span>
                <span> · {startTime} hs</span>
              </>
            ) : (
              "Completá día y horario para confirmar"
            )}
          </p>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-teal-900/15"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Volver
            </Button>
            <Button
              type="button"
              className="bg-teal-800 hover:bg-teal-900 sm:min-w-[10.5rem]"
              disabled={pending || !canConfirm || !appointment}
              onClick={() => {
                if (!date || !startTime) return;
                onConfirm({ date, startTime });
              }}
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
      </DialogContent>
    </Dialog>
  );
}
