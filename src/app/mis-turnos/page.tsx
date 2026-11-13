import { ManageAppointments } from "@/components/manage-appointments";
import { PageShell } from "@/components/page-shell";

export default function MisTurnosPage() {
  return (
    <PageShell
      eyebrow="Autogestión"
      title="Mis turnos"
      subtitle="Elegí un día en el calendario para ver o gestionar el turno."
      className="max-w-5xl"
    >
      <div className="h-full min-h-0 p-3 sm:p-4">
        <ManageAppointments />
      </div>
    </PageShell>
  );
}
