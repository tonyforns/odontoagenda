"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { Patient, PatientSex } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SEX_OPTIONS: { value: PatientSex; label: string }[] = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
  { value: "undisclosed", label: "Prefiero no decir" },
];

type Props = {
  patient: Patient;
  onSaved: (patient: Patient) => void;
};

export function PatientProfileForm({ patient, onSaved }: Props) {
  const [firstName, setFirstName] = useState(patient.firstName);
  const [lastName, setLastName] = useState(patient.lastName);
  const [dni, setDni] = useState(patient.dni ?? "");
  const [birthDate, setBirthDate] = useState(patient.birthDate ?? "");
  const [sex, setSex] = useState<PatientSex | "">(patient.sex ?? "");
  const [obraSocial, setObraSocial] = useState(patient.obraSocial ?? "");
  const [phone, setPhone] = useState(patient.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!sex) {
      setError("Seleccioná el sexo.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/patients/me", {
        method: "PUT",
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
      onSaved(data.patient);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-teal-950">
          Tu ficha de paciente
        </h2>
        <p className="mt-1 text-sm text-teal-900/70">
          Completá estos datos una vez. Quedan vinculados a tu cuenta Gmail.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Email Gmail</Label>
          <Input id="email" value={patient.email} readOnly className="bg-teal-50/50" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dni">DNI</Label>
          <Input
            id="dni"
            inputMode="numeric"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            required
            placeholder="30111222"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthDate">Fecha de nacimiento</Label>
          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sex">Sexo</Label>
          <select
            id="sex"
            className="flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
            value={sex}
            onChange={(e) => setSex(e.target.value as PatientSex)}
            required
          >
            <option value="" disabled>
              Seleccioná…
            </option>
            {SEX_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="obraSocial">Obra social</Label>
          <Input
            id="obraSocial"
            value={obraSocial}
            onChange={(e) => setObraSocial(e.target.value)}
            required
            placeholder="OSDE / Particular / Swiss Medical…"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="phone">Teléfono de contacto</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="11 5555-1212"
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="bg-teal-800 hover:bg-teal-900"
        size="lg"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Guardando…
          </>
        ) : (
          "Guardar ficha"
        )}
      </Button>
    </form>
  );
}
