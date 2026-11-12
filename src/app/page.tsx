import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clinic } from "@/lib/clinic";

export default function HomePage() {
  return (
    <div className="h-full overflow-y-auto">
      <section className="relative">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="animate-rise">
            <p className="font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight text-teal-950 sm:text-6xl md:text-7xl">
              {clinic.brand}
            </p>
            <h1 className="mt-5 max-w-xl text-2xl font-medium leading-snug text-teal-900/90 sm:text-3xl">
              Turnos online para {clinic.name}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-teal-900/70 sm:text-lg">
              Entrá con Gmail, elegí el horario libre de {clinic.doctorName} y
              sumalo a tu calendario en un clic.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-teal-800 hover:bg-teal-900">
                <Link href="/reservar">
                  Pedir turno <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/mis-turnos">Cancelar o reprogramar</Link>
              </Button>
            </div>
          </div>

          <div className="animate-rise-delay relative min-h-[280px] pb-6 sm:min-h-[360px] sm:pb-4">
            <div className="absolute inset-0 bottom-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-600 shadow-[0_30px_80px_-40px_rgba(15,80,70,0.7)] sm:bottom-4">
              <img
                src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1400&q=80"
                alt="Consultorio odontológico moderno"
                className="h-full w-full object-cover opacity-85 mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950/70 via-teal-900/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-teal-50">
                <p className="font-[family-name:var(--font-display)] text-2xl">
                  {clinic.doctorName}
                </p>
                <p className="mt-1 text-sm text-teal-100/85">
                  {clinic.specialty} · {clinic.address}
                </p>
              </div>
            </div>
            <div className="animate-float absolute -bottom-1 -left-2 z-10 rounded-2xl border border-white/40 bg-white/90 px-4 py-3 text-sm shadow-lg backdrop-blur sm:bottom-0 sm:left-4">
              <p className="font-medium text-teal-950">Lun a vie</p>
              <p className="text-teal-800/70">09–12 · 15–18 hs</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
