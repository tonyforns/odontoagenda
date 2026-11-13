"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { Patient, PatientSex } from "@/lib/types";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (patient: Patient) => void;
};

export function CreatePatientDialog({
  open,
  onOpenChange,
  onCreated,
}: Props) {
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

  function reset() {
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

  function handleOpenChange(next: boolean) {
    if (!next && !pending) reset();
    onOpenChange(next);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sex) {
      setError("Seleccioná el sexo.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/admin/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          dni,
          birthDate,
          sex,
          obraSocial,
          phone,
          email: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el paciente.");
        return;
      }
      onCreated(data.patient as Patient);
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-xl text-teal-950">
            Nuevo paciente
          </DialogTitle>
          <DialogDescription>
            Completá la ficha para agregarlo al consultorio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-first">Nombre</Label>
              <Input
                id="create-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-last">Apellido</Label>
              <Input
                id="create-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-dni">DNI</Label>
              <Input
                id="create-dni"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-birth">Nacimiento</Label>
              <Input
                id="create-birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-sex">Sexo</Label>
              <Select
                value={sex || undefined}
                onValueChange={(value) => setSex(value as PatientSex)}
                required
              >
                <SelectTrigger id="create-sex" className="w-full">
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
              <Label htmlFor="create-obra">Obra social</Label>
              <Input
                id="create-obra"
                value={obraSocial}
                onChange={(e) => setObraSocial(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-phone">Teléfono</Label>
              <Input
                id="create-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-email">Email (opcional)</Label>
              <Input
                id="create-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-teal-800 hover:bg-teal-900"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Guardando…
              </>
            ) : (
              "Agregar paciente"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
