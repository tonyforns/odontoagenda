import { ManageAppointments } from "@/components/manage-appointments";

export default function MisTurnosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10 animate-rise">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal-800/70">
          Autogestión
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-teal-950 sm:text-5xl">
          Mis turnos
        </h1>
        <p className="mt-3 max-w-2xl text-teal-900/70">
          Ingresá el DNI y la fecha de nacimiento con los que reservaste para
          cancelar, reprogramar o agregarlo a tu calendario.
        </p>
      </div>
      <div className="animate-rise-delay rounded-[1.5rem] border border-teal-900/10 bg-white/75 p-6 shadow-sm backdrop-blur sm:p-8">
        <ManageAppointments />
      </div>
    </div>
  );
}
