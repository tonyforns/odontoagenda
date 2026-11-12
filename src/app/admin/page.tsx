import { AdminPanel } from "@/components/admin-panel";
import { PageShell } from "@/components/page-shell";
import { clinic } from "@/lib/clinic";

export default function AdminPage() {
  return (
    <PageShell eyebrow="Administración" title={clinic.brand}>
      <AdminPanel />
    </PageShell>
  );
}
