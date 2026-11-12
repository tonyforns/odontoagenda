import { BookingForm } from "@/components/booking-form";
import { PageShell } from "@/components/page-shell";

export default function ReservarPage() {
  return (
    <PageShell
      eyebrow="Reserva online"
      title="Pedí tu turno"
      className="max-w-5xl"
    >
      <div className="h-full min-h-0 p-3 sm:p-4">
        <BookingForm />
      </div>
    </PageShell>
  );
}
