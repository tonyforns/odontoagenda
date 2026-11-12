"use client";

import { LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { clinic } from "@/lib/clinic";
import { isStaffRole } from "@/lib/staff-role";
import { cn } from "@/lib/utils";

const NAV = [
  {
    href: "/reservar",
    label: "Reservar",
    requiresAuth: false,
    requiresStaff: false,
    requiresAdmin: false,
  },
  {
    href: "/mis-turnos",
    label: "Mis turnos",
    requiresAuth: true,
    requiresStaff: false,
    requiresAdmin: false,
  },
  {
    href: "/consultorio",
    label: "Consultorio",
    requiresAuth: true,
    requiresStaff: true,
    requiresAdmin: false,
  },
  {
    href: "/admin",
    label: "Admin",
    requiresAuth: true,
    requiresStaff: false,
    requiresAdmin: true,
  },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user);
  const isStaff = isStaffRole(session?.user?.role);
  const isAdmin = session?.user?.role === "admin";
  const navItems = NAV.filter((item) => {
    if (item.requiresAdmin) return isAdmin;
    if (item.requiresStaff) return isStaff;
    if (item.requiresAuth) return signedIn;
    return true;
  });

  return (
    <header className="relative z-20 shrink-0 border-b border-teal-900/10 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5"
          aria-label={`${clinic.brand} — inicio`}
        >
          <span
            aria-hidden
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-[0.7rem] font-semibold tracking-wide text-teal-50 shadow-sm transition group-hover:bg-teal-900"
          >
            OA
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate font-[family-name:var(--font-display)] text-lg leading-none tracking-tight text-teal-950 transition group-hover:text-teal-800 sm:text-xl">
              {clinic.brand}
            </span>
            <span className="mt-0.5 block truncate text-[0.65rem] text-teal-800/55">
              {clinic.name}
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <nav
            aria-label="Principal"
            className="flex items-center rounded-full border border-teal-900/10 bg-teal-50/70 p-0.5"
          >
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium transition sm:px-3.5 sm:text-sm",
                    active
                      ? "bg-white text-teal-950 shadow-sm ring-1 ring-teal-900/10"
                      : "text-teal-900/65 hover:text-teal-950",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {!signedIn && status !== "loading" ? (
              <button
                type="button"
                onClick={() =>
                  signIn("google", {
                    callbackUrl: pathname || "/reservar",
                    redirect: true,
                  })
                }
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium text-teal-900/65 transition hover:text-teal-950 sm:px-3.5 sm:text-sm"
              >
                <LogIn className="size-3.5 shrink-0" />
                Iniciar sesión
              </button>
            ) : null}
          </nav>

          {signedIn ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              title={
                session?.user?.email
                  ? `Salir (${session.user.email})`
                  : "Salir"
              }
              aria-label="Salir"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-teal-900/10 bg-white px-2.5 text-xs font-medium text-teal-800/80 transition hover:border-teal-800/25 hover:bg-teal-50 hover:text-teal-950 sm:px-3"
            >
              <LogOut className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
