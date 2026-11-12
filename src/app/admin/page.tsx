import { AdminPanel } from "@/components/admin-panel";
import { PageShell } from "@/components/page-shell";
import { clinic } from "@/lib/clinic";

export default function AdminPage() {
  return (
    <PageShell
      eyebrow="Panel del profesional"
      title={clinic.doctorName}
      subtitle="Agenda · Pacientes · Fichas"
    >
      <AdminPanel />
    </PageShell>
  );
}
