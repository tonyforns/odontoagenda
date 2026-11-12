import { BookingForm } from "@/components/booking-form";

export default function ReservarPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 max-w-2xl animate-rise">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800/60">
          Reserva online
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-teal-950 sm:text-5xl">
          Pedí tu turno
        </h1>
      </div>

      <div className="animate-rise-delay rounded-[1.75rem] border border-teal-900/10 bg-white/80 p-5 shadow-[0_24px_60px_-40px_rgba(15,80,70,0.45)] backdrop-blur-sm sm:p-7">
        <BookingForm />
      </div>
    </div>
  );
}
