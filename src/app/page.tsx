import Link from "next/link";
import { ArrowRight, CalendarClock, IdCard, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clinic } from "@/lib/clinic";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-rise">
            <p className="font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight text-teal-950 sm:text-6xl md:text-7xl">
              {clinic.brand}
            </p>
            <h1 className="mt-5 max-w-xl text-2xl font-medium leading-snug text-teal-900/90 sm:text-3xl">
              Turnos online para {clinic.name}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-teal-900/70 sm:text-lg">
              Elegí el horario libre de {clinic.doctorName}, reservá con tu DNI
              y fecha de nacimiento, y sumalo a tu calendario en un clic.
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

          <div className="animate-rise-delay relative min-h-[280px] sm:min-h-[360px]">
            <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-600 shadow-[0_30px_80px_-40px_rgba(15,80,70,0.7)]">
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
            <div className="animate-float absolute -bottom-4 -left-2 rounded-2xl border border-white/40 bg-white/90 px-4 py-3 text-sm shadow-lg backdrop-blur sm:left-4">
              <p className="font-medium text-teal-950">Lun a vie</p>
              <p className="text-teal-800/70">09–12 · 15–18 hs</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-teal-900/10 bg-white/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
          <Feature
            icon={<CalendarClock className="size-5" />}
            title="Horarios reales"
            text="Solo se muestran franjas libres según la agenda del consultorio."
          />
          <Feature
            icon={<IdCard className="size-5" />}
            title="Identidad con DNI"
            text="Cada reserva queda ligada a DNI y fecha de nacimiento para gestionarlo después."
          />
          <Feature
            icon={<RefreshCcw className="size-5" />}
            title="Google Calendar"
            text="El turno entra al calendario Gmail del profesional; el paciente puede agregarlo al suyo."
          />
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="space-y-3">
      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-teal-800 text-teal-50">
        {icon}
      </div>
      <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
        {title}
      </h2>
      <p className="text-sm leading-relaxed text-teal-900/70">{text}</p>
    </div>
  );
}
