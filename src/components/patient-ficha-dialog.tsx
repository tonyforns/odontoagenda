"use client";

import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Appointment, Patient } from "@/lib/types";
import {
  SEX_LABELS,
  isProfileComplete,
  patientDisplayName,
} from "@/lib/patient-utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatLongDate(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "EEE d MMM yyyy", {
    locale: es,
  });
}

type Props = {
  patientId: string | null;
  pin: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PatientFichaDialog({
  patientId,
  pin,
  open,
  onOpenChange,
}: Props) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !patientId) {
      setPatient(null);
      setAppointments([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/patients/${patientId}`, {
      headers: { "x-doctor-pin": pin },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo cargar la ficha");
        if (cancelled) return;
        setPatient(data.patient);
        setAppointments(data.appointments ?? []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, patientId, pin]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-xl text-teal-950">
            {patient ? patientDisplayName(patient) : "Ficha del paciente"}
          </DialogTitle>
          <DialogDescription>
            Datos clínicos y turnos registrados en el consultorio.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-teal-900/70">
            <Loader2 className="size-4 animate-spin" /> Cargando ficha…
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {patient && !loading ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {isProfileComplete(patient) ? "Ficha completa" : "Ficha incompleta"}
              </Badge>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-teal-900/55">Email</dt>
                <dd className="text-teal-950">{patient.email}</dd>
              </div>
              <div>
                <dt className="text-teal-900/55">DNI</dt>
                <dd className="text-teal-950">{patient.dni || "—"}</dd>
              </div>
              <div>
                <dt className="text-teal-900/55">Nacimiento</dt>
                <dd className="text-teal-950">
                  {patient.birthDate
                    ? formatLongDate(patient.birthDate)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-teal-900/55">Sexo</dt>
                <dd className="text-teal-950">
                  {patient.sex ? SEX_LABELS[patient.sex] : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-teal-900/55">Obra social</dt>
                <dd className="text-teal-950">{patient.obraSocial || "—"}</dd>
              </div>
              <div>
                <dt className="text-teal-900/55">Teléfono</dt>
                <dd className="text-teal-950">{patient.phone || "—"}</dd>
              </div>
            </dl>

            <div>
              <h3 className="mb-2 text-sm font-medium text-teal-950">Turnos</h3>
              {appointments.length === 0 ? (
                <p className="text-sm text-teal-900/60">Sin turnos registrados.</p>
              ) : (
                <ul className="space-y-2">
                  {appointments.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-900/10 bg-teal-50/40 px-3 py-2 text-sm"
                    >
                      <span className="capitalize text-teal-950">
                        {formatLongDate(a.date)} · {a.startTime}
                      </span>
                      <Badge
                        variant={
                          a.status === "confirmed" ? "secondary" : "outline"
                        }
                      >
                        {a.status === "confirmed" ? "Confirmado" : "Cancelado"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
