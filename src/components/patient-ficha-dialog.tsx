"use client";

import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Pencil } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { Appointment, Patient, PatientSex } from "@/lib/types";
import {
  SEX_LABELS,
  isProfileComplete,
  patientDisplayName,
} from "@/lib/patient-utils";
import { CancelAppointmentConfirmDialog } from "@/components/cancel-appointment-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SEX_OPTIONS: { value: PatientSex; label: string }[] = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
  { value: "undisclosed", label: "Prefiero no decir" },
];

function formatLongDate(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "EEE d MMM yyyy", {
    locale: es,
  });
}

type Props = {
  patientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Solo desde la sección Pacientes */
  allowEdit?: boolean;
  /** Solo desde un turno de la agenda */
  allowCancel?: boolean;
  focusAppointmentId?: string | null;
  onUpdated?: (patient: Patient) => void;
  onAppointmentCancelled?: (appointment: Appointment) => void;
};

export function PatientFichaDialog({
  patientId,
  open,
  onOpenChange,
  allowEdit = false,
  allowCancel = false,
  focusAppointmentId = null,
  onUpdated,
  onAppointmentCancelled,
}: Props) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelPending, setCancelPending] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<PatientSex | "">("");
  const [obraSocial, setObraSocial] = useState("");
  const [phone, setPhone] = useState("");

  function hydrateForm(p: Patient) {
    setFirstName(p.firstName);
    setLastName(p.lastName);
    setDni(p.dni ?? "");
    setBirthDate(p.birthDate ?? "");
    setSex(p.sex ?? "");
    setObraSocial(p.obraSocial ?? "");
    setPhone(p.phone ?? "");
  }

  useEffect(() => {
    if (!open || !patientId) {
      setPatient(null);
      setAppointments([]);
      setError(null);
      setEditing(false);
      setCancelTarget(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setEditing(false);
    setCancelTarget(null);

    fetch(`/api/admin/patients/${patientId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo cargar la ficha");
        if (cancelled) return;
        setPatient(data.patient);
        hydrateForm(data.patient as Patient);
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
  }, [open, patientId]);

  function startEdit() {
    if (!patient || !allowEdit) return;
    hydrateForm(patient);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    if (patient) hydrateForm(patient);
    setError(null);
    setEditing(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId || !allowEdit) return;
    setError(null);
    if (!sex) {
      setError("Seleccioná el sexo.");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          dni,
          birthDate,
          sex,
          obraSocial,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar la ficha.");
        return;
      }
      const next = data.patient as Patient;
      setPatient(next);
      hydrateForm(next);
      setEditing(false);
      onUpdated?.(next);
    });
  }

  function requestCancelAppointment(appointment: Appointment) {
    if (!allowCancel || appointment.status !== "confirmed") return;
    setError(null);
    setCancelTarget(appointment);
  }

  function confirmCancelAppointment() {
    if (!cancelTarget || !allowCancel) return;
    const appointment = cancelTarget;
    setError(null);
    setCancelPending(true);
    startTransition(async () => {
      const res = await fetch(`/api/admin/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      setCancelPending(false);
      if (!res.ok) {
        setError(data.error ?? "No se pudo cancelar el turno.");
        return;
      }
      const next = data.appointment as Appointment;
      setAppointments((prev) =>
        prev.map((a) => (a.id === next.id ? next : a)),
      );
      setCancelTarget(null);
      onAppointmentCancelled?.(next);
    });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="font-[family-name:var(--font-display)] text-xl text-teal-950">
                {patient ? patientDisplayName(patient) : "Ficha del paciente"}
              </DialogTitle>
              <DialogDescription>
                {allowEdit
                  ? "Datos clínicos y turnos del consultorio."
                  : "Detalle del turno. La ficha no se edita desde acá."}
              </DialogDescription>
            </div>
            {patient && !loading && allowEdit && !editing ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 border-teal-900/15 text-teal-800"
                onClick={startEdit}
              >
                <Pencil className="size-3.5" />
                Editar
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-teal-900/70">
            <Loader2 className="size-4 animate-spin" /> Cargando ficha…
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {patient && !loading && !editing ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {isProfileComplete(patient)
                  ? "Ficha completa"
                  : "Ficha incompleta"}
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

            <AppointmentsList
              appointments={appointments}
              allowCancel={allowCancel}
              focusAppointmentId={focusAppointmentId}
              pending={pending || cancelPending}
              onRequestCancel={requestCancelAppointment}
            />
          </div>
        ) : null}

        {patient && !loading && editing && allowEdit ? (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ficha-firstName">Nombre</Label>
                <Input
                  id="ficha-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ficha-lastName">Apellido</Label>
                <Input
                  id="ficha-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <p className="text-sm text-teal-900/55">Email</p>
                <p className="rounded-md border border-teal-900/10 bg-teal-50/50 px-3 py-2 text-sm text-teal-950">
                  {patient.email}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ficha-dni">DNI</Label>
                <Input
                  id="ficha-dni"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ficha-birthDate">Nacimiento</Label>
                <Input
                  id="ficha-birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ficha-sex">Sexo</Label>
                <Select
                  value={sex || undefined}
                  onValueChange={(value) => setSex(value as PatientSex)}
                  required
                >
                  <SelectTrigger id="ficha-sex" className="w-full">
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    {SEX_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ficha-phone">Teléfono</Label>
                <Input
                  id="ficha-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ficha-obraSocial">Obra social</Label>
                <Input
                  id="ficha-obraSocial"
                  value={obraSocial}
                  onChange={(e) => setObraSocial(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={pending}
                className="bg-teal-800 hover:bg-teal-900"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Guardando…
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="border-teal-900/15"
                onClick={cancelEdit}
              >
                Cancelar
              </Button>
            </div>

            <AppointmentsList
              appointments={appointments}
              allowCancel={false}
              focusAppointmentId={null}
              pending={pending}
              onRequestCancel={() => undefined}
            />
          </form>
        ) : null}
      </DialogContent>
    </Dialog>

    <CancelAppointmentConfirmDialog
      appointment={cancelTarget}
      open={Boolean(cancelTarget)}
      pending={cancelPending}
      onOpenChange={(next) => {
        if (!next && !cancelPending) setCancelTarget(null);
      }}
      onConfirm={confirmCancelAppointment}
    />
    </>
  );
}

function AppointmentsList({
  appointments,
  allowCancel,
  focusAppointmentId,
  pending,
  onRequestCancel,
}: {
  appointments: Appointment[];
  allowCancel: boolean;
  focusAppointmentId: string | null;
  pending: boolean;
  onRequestCancel: (appointment: Appointment) => void;
}) {
  const ordered = [...appointments].sort((a, b) => {
    if (focusAppointmentId) {
      if (a.id === focusAppointmentId) return -1;
      if (b.id === focusAppointmentId) return 1;
    }
    return `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`);
  });

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-teal-950">Turnos</h3>
      {ordered.length === 0 ? (
        <p className="text-sm text-teal-900/60">Sin turnos registrados.</p>
      ) : (
        <ul className="space-y-2">
          {ordered.map((a) => {
            const focused = focusAppointmentId === a.id;
            const canCancel =
              allowCancel && a.status === "confirmed" && focused;
            return (
              <li
                key={a.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                  focused
                    ? "border-teal-800/30 bg-teal-50/80"
                    : "border-teal-900/10 bg-teal-50/40"
                }`}
              >
                <span className="capitalize text-teal-950">
                  {formatLongDate(a.date)} · {a.startTime}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      a.status === "confirmed" ? "secondary" : "outline"
                    }
                  >
                    {a.status === "confirmed" ? "Confirmado" : "Cancelado"}
                  </Badge>
                  {canCancel ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-red-200 text-red-700 hover:bg-red-50"
                      disabled={pending}
                      onClick={() => onRequestCancel(a)}
                    >
                      Cancelar turno
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
