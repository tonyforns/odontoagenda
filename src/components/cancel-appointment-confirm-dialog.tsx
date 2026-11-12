"use client";

import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import type { Appointment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatLongDate(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "EEE d MMM yyyy", {
    locale: es,
  });
}

type Props = {
  appointment: Appointment | null;
  open: boolean;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function CancelAppointmentConfirmDialog({
  appointment,
  open,
  pending = false,
  onOpenChange,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-xl text-teal-950">
            Cancelar turno
          </DialogTitle>
          <DialogDescription>
            {appointment
              ? `¿Confirmás cancelar el turno del ${formatLongDate(appointment.date)} a las ${appointment.startTime}?`
              : "¿Confirmás cancelar este turno?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-teal-900/15"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            No
          </Button>
          <Button
            type="button"
            className="bg-red-700 hover:bg-red-800"
            disabled={pending || !appointment}
            onClick={onConfirm}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Cancelando…
              </>
            ) : (
              "Sí, cancelar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
