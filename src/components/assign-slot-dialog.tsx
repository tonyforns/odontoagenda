"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { Patient, PatientSex } from "@/lib/types";
import { filterPatients, patientDisplayName } from "@/lib/patient-utils";
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
import { cn } from "@/lib/utils";

const SEX_OPTIONS: { value: PatientSex; label: string }[] = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
  { value: "undisclosed", label: "Prefiero no decir" },
];

type Mode = "existing" | "new";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  startTime: string;
  endTime: string;
  patients: Patient[];
  onAssigned: (result: { appointment: unknown; patient: Patient }) => void;
};

export function AssignSlotDialog({
  open,
  onOpenChange,
  date,
  startTime,
  endTime,
  patients,
  onAssigned,
}: Props) {
  const [mode, setMode] = useState<Mode>("existing");
  const [query, setQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<PatientSex | "">("");
  const [obraSocial, setObraSocial] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => filterPatients(patients, query).slice(0, 8),
    [patients, query],
  );

  function resetForm() {
    setMode("existing");
    setQuery("");
    setSelectedPatientId(null);
    setFirstName("");
    setLastName("");
    setDni("");
    setBirthDate("");
    setSex("");
    setObraSocial("");
    setPhone("");
    setEmail("");
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const body =
        mode === "existing"
          ? {
              date,
              startTime,
              patientId: selectedPatientId,
            }
          : {
              date,
              startTime,
              patient: {
                firstName,
                lastName,
                dni,
                birthDate,
                sex,
                obraSocial,
                phone,
                email: email.trim() || undefined,
              },
            };

      if (mode === "existing" && !selectedPatientId) {
        setError("Elegí un paciente de la lista.");
        return;
      }
      if (mode === "new" && !sex) {
        setError("Seleccioná el sexo.");
        return;
      }

      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo asignar el turno.");
        return;
      }
      onAssigned({ appointment: data.appointment, patient: data.patient });
      resetForm();
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-xl text-teal-950">
            Asignar turno
          </DialogTitle>
          <DialogDescription>
            {date} · {startTime}–{endTime}. Elegí un paciente o creá una ficha.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-teal-50/80 p-1">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm transition",
              mode === "existing"
                ? "bg-white text-teal-950 shadow-sm"
                : "text-teal-900/60",
            )}
            onClick={() => setMode("existing")}
          >
            Paciente existente
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm transition",
              mode === "new"
                ? "bg-white text-teal-950 shadow-sm"
                : "text-teal-900/60",
            )}
            onClick={() => setMode("new")}
          >
            Nueva ficha
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "existing" ? (
            <div className="space-y-2">
              <Label htmlFor="assign-search">Buscar paciente</Label>
              <Input
                id="assign-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, DNI, teléfono…"
              />
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-teal-900/10">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-teal-900/55">
                    No hay coincidencias.
                  </li>
                ) : (
                  filtered.map((p) => {
                    const selected = selectedPatientId === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedPatientId(p.id)}
                          className={cn(
                            "flex w-full flex-col items-start px-3 py-2 text-left text-sm transition",
                            selected
                              ? "bg-teal-800 text-white"
                              : "hover:bg-teal-50",
                          )}
                        >
                          <span className="font-medium">
                            {patientDisplayName(p)}
                          </span>
                          <span
                            className={cn(
                              "text-xs",
                              selected ? "text-white/75" : "text-teal-900/55",
                            )}
                          >
                            {[p.dni, p.phone, p.obraSocial]
                              .filter(Boolean)
                              .join(" · ") || p.email}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-first">Nombre</Label>
                <Input
                  id="new-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-last">Apellido</Label>
                <Input
                  id="new-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-dni">DNI</Label>
                <Input
                  id="new-dni"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-birth">Nacimiento</Label>
                <Input
                  id="new-birth"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-sex">Sexo</Label>
                <select
                  id="new-sex"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as PatientSex | "")}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                >
                  <option value="">Seleccionar…</option>
                  {SEX_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-obra">Obra social</Label>
                <Input
                  id="new-obra"
                  value={obraSocial}
                  onChange={(e) => setObraSocial(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-phone">Teléfono</Label>
                <Input
                  id="new-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-email">Email (opcional)</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-teal-800 hover:bg-teal-900"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Asignando…
              </>
            ) : (
              "Confirmar asignación"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
