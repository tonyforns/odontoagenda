"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { clinic } from "@/lib/clinic";

export function SiteHeader() {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user);

  return (
    <header className="relative z-20 border-b border-teal-900/10 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-teal-950 transition group-hover:text-teal-800">
            {clinic.brand}
          </span>
          <span className="hidden text-sm text-teal-800/70 sm:inline">
            {clinic.name}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <Link
            href="/reservar"
            className="rounded-md px-3 py-2 font-medium text-teal-950 transition hover:bg-teal-50"
          >
            Reservar
          </Link>
          <Link
            href="/mis-turnos"
            className="rounded-md px-3 py-2 text-teal-900/80 transition hover:bg-teal-50"
          >
            Mis turnos
          </Link>
          <Link
            href="/admin"
            className="rounded-md px-3 py-2 text-teal-900/60 transition hover:bg-teal-50"
          >
            Consultorio
          </Link>
          {signedIn ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              title={session?.user?.email ? `Salir (${session.user.email})` : "Salir"}
              aria-label="Salir"
              className="ml-1 flex size-9 items-center justify-center rounded-full text-teal-800/70 transition hover:bg-teal-50 hover:text-teal-950"
            >
              <LogOut className="size-4" />
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
