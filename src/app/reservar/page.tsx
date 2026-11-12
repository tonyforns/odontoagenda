import { Suspense } from "react";
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
        <Suspense
          fallback={
            <p className="flex h-full items-center justify-center text-sm text-teal-900/60">
              Preparando reserva…
            </p>
          }
        >
          <BookingForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
