"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { Appointment, Patient } from "@/lib/types";
import { filterPatients, patientDisplayName } from "@/lib/patient-utils";
import { AdminAgendaByDay } from "@/components/admin-agenda-by-day";
import { AssignSlotDialog } from "@/components/assign-slot-dialog";
import { PatientFichaDialog } from "@/components/patient-ficha-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Tab = "agenda" | "pacientes";

export function AdminPanel() {
  const [pin, setPin] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [calendarMode, setCalendarMode] = useState<"google" | "mock" | null>(
    null,
  );
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<Tab>("agenda");
  const [fichaPatientId, setFichaPatientId] = useState<string | null>(null);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSlot, setAssignSlot] = useState<{
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filteredPatients = useMemo(
    () => filterPatients(patients, patientQuery),
    [patients, patientQuery],
  );

  function openFicha(patientId: string) {
    setFichaPatientId(patientId);
    setFichaOpen(true);
  }

  function openAssign(slot: {
    date: string;
    startTime: string;
    endTime: string;
  }) {
    setAssignSlot(slot);
    setAssignOpen(true);
  }

  async function refreshConsultorio() {
    const headers = { "x-doctor-pin": pin };
    const [apptRes, patientsRes] = await Promise.all([
      fetch("/api/admin/appointments", { headers }),
      fetch("/api/admin/patients", { headers }),
    ]);
    const apptData = await apptRes.json();
    const patientsData = await patientsRes.json();
    if (apptRes.ok) {
      setAppointments(apptData.appointments ?? []);
      setCalendarMode(apptData.calendar?.mode ?? null);
    }
    if (patientsRes.ok) {
      setPatients(patientsData.patients ?? []);
    }
  }

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const headers = { "x-doctor-pin": pin };
      const [apptRes, patientsRes] = await Promise.all([
        fetch("/api/admin/appointments", { headers }),
        fetch("/api/admin/patients", { headers }),
      ]);
      const apptData = await apptRes.json();
      const patientsData = await patientsRes.json();
      if (!apptRes.ok) {
        setError(apptData.error ?? "Acceso denegado");
        setUnlocked(false);
        return;
      }
      if (!patientsRes.ok) {
        setError(patientsData.error ?? "No se pudo cargar pacientes");
        setUnlocked(false);
        return;
      }
      setAppointments(apptData.appointments ?? []);
      setPatients(patientsData.patients ?? []);
      setCalendarMode(apptData.calendar?.mode ?? null);
      setHint(apptData.demoPinHint);
      setUnlocked(true);
    });
  }

  if (!unlocked) {
    return (
      <form
        onSubmit={unlock}
        className="mx-auto flex h-full max-w-sm flex-col justify-center space-y-3 p-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="pin">PIN del consultorio</Label>
          <Input
            id="pin"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            placeholder="••••••"
          />
          <p className="text-xs text-teal-900/60">
            Demo: <code>1752</code>
          </p>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button
          type="submit"
          disabled={pending}
          className="bg-teal-800 hover:bg-teal-900"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Entrando…
            </>
          ) : (
            "Ver consultorio"
          )}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-teal-900/10 px-3 py-2">
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={tab === "agenda" ? "default" : "ghost"}
            className={cn(
              "h-8",
              tab === "agenda"
                ? "bg-teal-800 hover:bg-teal-900"
                : "text-teal-900/70",
            )}
            onClick={() => setTab("agenda")}
          >
            Agenda
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "pacientes" ? "default" : "ghost"}
            className={cn(
              "h-8",
              tab === "pacientes"
                ? "bg-teal-800 hover:bg-teal-900"
                : "text-teal-900/70",
            )}
            onClick={() => setTab("pacientes")}
          >
            Pacientes ({patients.length})
          </Button>
        </div>
        <p className="text-xs text-teal-900/60">
          Calendar:{" "}
          <strong className="font-medium text-teal-950">
            {calendarMode === "google" ? "conectado" : "demo"}
          </strong>
          {hint ? (
            <>
              {" "}
              · PIN <code>{hint}</code>
            </>
          ) : null}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
        {tab === "agenda" ? (
          <AdminAgendaByDay
            appointments={appointments}
            onSelectPatient={openFicha}
            onSelectFreeSlot={openAssign}
          />
        ) : patients.length === 0 ? (
          <p className="p-2 text-sm text-teal-900/70">
            Todavía no hay pacientes registrados.
          </p>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-2">
            <div className="flex shrink-0 items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="patient-search" className="text-xs">
                  Buscar
                </Label>
                <Input
                  id="patient-search"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  placeholder="Nombre, DNI, teléfono, email…"
                  className="h-8"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-teal-900/70"
                disabled={!patientQuery}
                onClick={() => setPatientQuery("")}
              >
                Limpiar
              </Button>
            </div>

            <p className="shrink-0 text-xs text-teal-900/55">
              Mostrando {filteredPatients.length} de {patients.length}
            </p>

            {filteredPatients.length === 0 ? (
              <p className="text-sm text-teal-900/70">
                Ningún paciente coincide con la búsqueda.
              </p>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-teal-900/10 bg-white/90">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-teal-900/10 bg-teal-50/95 text-teal-900/60 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 font-medium">Paciente</th>
                      <th className="px-3 py-2 font-medium">DNI</th>
                      <th className="px-3 py-2 font-medium">Teléfono</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Obra social</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p) => (
                      <tr
                        key={p.id}
                        className="cursor-pointer border-b border-teal-900/5 transition-colors last:border-0 hover:bg-teal-50/70"
                        onClick={() => openFicha(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openFicha(p.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <td className="px-3 py-2 font-medium text-teal-950">
                          {patientDisplayName(p)}
                        </td>
                        <td className="px-3 py-2">{p.dni || "—"}</td>
                        <td className="px-3 py-2">{p.phone || "—"}</td>
                        <td className="px-3 py-2">{p.email}</td>
                        <td className="px-3 py-2">{p.obraSocial || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <PatientFichaDialog
        patientId={fichaPatientId}
        pin={pin}
        open={fichaOpen}
        onOpenChange={setFichaOpen}
      />

      {assignSlot ? (
        <AssignSlotDialog
          open={assignOpen}
          onOpenChange={(open) => {
            setAssignOpen(open);
            if (!open) setAssignSlot(null);
          }}
          pin={pin}
          date={assignSlot.date}
          startTime={assignSlot.startTime}
          endTime={assignSlot.endTime}
          patients={patients}
          onAssigned={() => {
            void refreshConsultorio();
          }}
        />
      ) : null}
    </div>
  );
}
