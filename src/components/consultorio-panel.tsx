"use client";

import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Appointment, Patient } from "@/lib/types";
import {
  PATIENTS_PAGE_SIZE,
  filterPatients,
  paginateItems,
  patientDisplayName,
} from "@/lib/patient-utils";
import { isStaffRole } from "@/lib/staff-role";
import { AdminAgendaByDay } from "@/components/admin-agenda-by-day";
import { AssignSlotDialog } from "@/components/assign-slot-dialog";
import { ConsultorioScheduleEditor } from "@/components/consultorio-schedule-editor";
import { CreatePatientDialog } from "@/components/create-patient-dialog";
import { PatientFichaDialog } from "@/components/patient-ficha-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "agenda" | "pacientes" | "horarios";

export function ConsultorioPanel() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isStaff = isStaffRole(role);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [calendarMode, setCalendarMode] = useState<"google" | "mock" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("agenda");
  const [fichaPatientId, setFichaPatientId] = useState<string | null>(null);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [fichaAllowEdit, setFichaAllowEdit] = useState(false);
  const [fichaAllowCancel, setFichaAllowCancel] = useState(false);
  const [fichaAppointmentId, setFichaAppointmentId] = useState<string | null>(
    null,
  );
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSlot, setAssignSlot] = useState<{
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const [createPatientOpen, setCreatePatientOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const filteredPatients = useMemo(
    () => filterPatients(patients, patientQuery),
    [patients, patientQuery],
  );

  const patientsPage = useMemo(
    () => paginateItems(filteredPatients, patientPage, PATIENTS_PAGE_SIZE),
    [filteredPatients, patientPage],
  );

  useEffect(() => {
    setPatientPage(1);
  }, [patientQuery]);

  useEffect(() => {
    if (patientPage > patientsPage.totalPages) {
      setPatientPage(patientsPage.totalPages);
    }
  }, [patientPage, patientsPage.totalPages]);

  function openFichaFromPatients(patientId: string) {
    setFichaPatientId(patientId);
    setFichaAllowEdit(true);
    setFichaAllowCancel(false);
    setFichaAppointmentId(null);
    setFichaOpen(true);
  }

  function openFichaFromAppointment(appointment: Appointment) {
    setFichaPatientId(appointment.patientId);
    setFichaAllowEdit(false);
    setFichaAllowCancel(true);
    setFichaAppointmentId(appointment.id);
    setFichaOpen(true);
  }

  async function cancelAppointmentFromAgenda(appointment: Appointment) {
    const res = await fetch(`/api/admin/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo cancelar el turno.");
      throw new Error(data.error ?? "No se pudo cancelar el turno.");
    }
    setError(null);
    await refreshConsultorio();
  }

  async function rescheduleAppointmentFromAgenda(
    appointment: Appointment,
    slot: { date: string; startTime: string },
  ) {
    const res = await fetch(`/api/admin/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reschedule",
        date: slot.date,
        startTime: slot.startTime,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo reprogramar el turno.");
      throw new Error(data.error ?? "No se pudo reprogramar el turno.");
    }
    setError(null);
    await refreshConsultorio();
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
    const [apptRes, patientsRes] = await Promise.all([
      fetch("/api/admin/appointments"),
      fetch("/api/admin/patients"),
    ]);
    const apptData = await apptRes.json();
    const patientsData = await patientsRes.json();
    if (!apptRes.ok) {
      setError(apptData.error ?? "No se pudo cargar la agenda");
      setLoaded(false);
      return;
    }
    if (!patientsRes.ok) {
      setError(patientsData.error ?? "No se pudo cargar pacientes");
      setLoaded(false);
      return;
    }
    setAppointments(apptData.appointments ?? []);
    setPatients(patientsData.patients ?? []);
    setCalendarMode(apptData.calendar?.mode ?? null);
    setError(null);
    setLoaded(true);
  }

  useEffect(() => {
    if (status !== "authenticated" || !isStaff) return;
    startTransition(() => {
      void refreshConsultorio();
    });
  }, [status, isStaff]);

  if (status === "loading") {
    return (
      <p className="flex h-full items-center justify-center gap-2 text-sm text-teal-900/70">
        <Loader2 className="size-4 animate-spin" /> Cargando sesión…
      </p>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto flex h-full max-w-sm flex-col justify-center space-y-3 p-4">
        <p className="text-sm text-teal-900/80">
          Iniciá sesión con Gmail para ver el consultorio.
        </p>
        <Button
          type="button"
          className="bg-teal-800 hover:bg-teal-900"
          onClick={() =>
            signIn("google", { callbackUrl: "/consultorio", redirect: true })
          }
        >
          Iniciar sesión
        </Button>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="mx-auto flex h-full max-w-sm flex-col justify-center space-y-2 p-4">
        <p className="text-sm text-teal-900/80">
          Tu cuenta no tiene acceso al consultorio.
        </p>
        <p className="text-xs text-teal-900/55">{session.user?.email}</p>
      </div>
    );
  }

  if (!loaded || pending) {
    return (
      <div className="mx-auto flex h-full max-w-sm flex-col justify-center space-y-3 p-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <p className="flex items-center justify-center gap-2 text-sm text-teal-900/70">
          <Loader2 className="size-4 animate-spin" /> Cargando consultorio…
        </p>
      </div>
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
            Pacientes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "horarios" ? "default" : "ghost"}
            className={cn(
              "h-8",
              tab === "horarios"
                ? "bg-teal-800 hover:bg-teal-900"
                : "text-teal-900/70",
            )}
            onClick={() => setTab("horarios")}
          >
            Horarios
          </Button>
        </div>
        <p className="text-xs text-teal-900/60">
          Calendar:{" "}
          <strong className="font-medium text-teal-950">
            {calendarMode === "google" ? "conectado" : "demo"}
          </strong>
          {" · "}
          <span className="capitalize">{role}</span>
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
        {tab === "agenda" ? (
          <AdminAgendaByDay
            appointments={appointments}
            onSelectAppointment={openFichaFromAppointment}
            onCancelAppointment={cancelAppointmentFromAgenda}
            onRescheduleAppointment={rescheduleAppointmentFromAgenda}
            onSelectFreeSlot={openAssign}
          />
        ) : tab === "horarios" ? (
          <ConsultorioScheduleEditor />
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-2">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Input
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                placeholder="Buscar por nombre, DNI, teléfono o email…"
                className="h-9 min-w-0 flex-1"
              />
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0 bg-teal-800 hover:bg-teal-900"
                onClick={() => setCreatePatientOpen(true)}
              >
                <Plus className="size-4" />
                Agregar
              </Button>
            </div>
            {patients.length === 0 ? (
              <p className="p-2 text-sm text-teal-900/70">
                Todavía no hay pacientes. Agregá el primero con el botón de
                arriba.
              </p>
            ) : filteredPatients.length === 0 ? (
              <p className="p-2 text-sm text-teal-900/70">
                Ningún paciente coincide con la búsqueda.
              </p>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-auto rounded-md border border-teal-900/10">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead className="sticky top-0 bg-teal-50/95 text-xs uppercase tracking-wide text-teal-900/55 backdrop-blur">
                      <tr>
                        <th className="px-3 py-2 font-medium">Paciente</th>
                        <th className="px-3 py-2 font-medium">DNI</th>
                        <th className="px-3 py-2 font-medium">Teléfono</th>
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 font-medium">Obra social</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientsPage.items.map((p) => (
                        <tr
                          key={p.id}
                          className="cursor-pointer border-b border-teal-900/5 transition-colors last:border-0 hover:bg-teal-50/70"
                          onClick={() => openFichaFromPatients(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openFichaFromPatients(p.id);
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
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-teal-900/10 pt-2">
                  <p className="text-xs text-teal-900/55">
                    {patientsPage.total} paciente
                    {patientsPage.total === 1 ? "" : "s"} · página{" "}
                    {patientsPage.page} de {patientsPage.totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-teal-900/15"
                      disabled={patientsPage.page <= 1}
                      onClick={() =>
                        setPatientPage((p) => Math.max(1, p - 1))
                      }
                    >
                      <ChevronLeft className="size-4" />
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-teal-900/15"
                      disabled={
                        patientsPage.page >= patientsPage.totalPages
                      }
                      onClick={() =>
                        setPatientPage((p) =>
                          Math.min(patientsPage.totalPages, p + 1),
                        )
                      }
                    >
                      Siguiente
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <PatientFichaDialog
        patientId={fichaPatientId}
        open={fichaOpen}
        onOpenChange={setFichaOpen}
        allowEdit={fichaAllowEdit}
        allowCancel={fichaAllowCancel}
        focusAppointmentId={fichaAppointmentId}
        onUpdated={() => {
          void refreshConsultorio();
        }}
        onAppointmentCancelled={() => {
          void refreshConsultorio();
        }}
      />

      <CreatePatientDialog
        open={createPatientOpen}
        onOpenChange={setCreatePatientOpen}
        onCreated={(patient) => {
          setPatients((prev) => {
            if (prev.some((p) => p.id === patient.id)) {
              return prev.map((p) => (p.id === patient.id ? patient : p));
            }
            return [...prev, patient];
          });
          setPatientQuery("");
          setPatientPage(1);
          openFichaFromPatients(patient.id);
        }}
      />

      {assignSlot ? (
        <AssignSlotDialog
          open={assignOpen}
          onOpenChange={(open) => {
            setAssignOpen(open);
            if (!open) setAssignSlot(null);
          }}
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
