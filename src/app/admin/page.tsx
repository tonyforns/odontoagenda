import { AdminPanel } from "@/components/admin-panel";
import { clinic } from "@/lib/clinic";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10 animate-rise">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal-800/70">
          Panel del profesional
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-teal-950 sm:text-5xl">
          Agenda de {clinic.doctorName}
        </h1>
        <p className="mt-3 max-w-2xl text-teal-900/70">
          Vista interna de turnos confirmados y estado de sincronización con
          Google Calendar.
        </p>
      </div>
      <div className="animate-rise-delay rounded-[1.5rem] border border-teal-900/10 bg-white/75 p-6 shadow-sm backdrop-blur sm:p-8">
        <AdminPanel />
      </div>
    </div>
  );
}
