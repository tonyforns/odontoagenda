import { ConsultorioPanel } from "@/components/consultorio-panel";
import { PageShell } from "@/components/page-shell";
import { clinic } from "@/lib/clinic";

export default function ConsultorioPage() {
  return (
    <PageShell eyebrow="Panel del profesional" title={clinic.doctorName}>
      <ConsultorioPanel />
    </PageShell>
  );
}
