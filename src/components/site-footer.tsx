"use client";

import { usePathname } from "next/navigation";
import { clinic } from "@/lib/clinic";

const HIDDEN_ON = new Set(["/admin", "/reservar", "/mis-turnos"]);

export function SiteFooter() {
  const pathname = usePathname();
  if (HIDDEN_ON.has(pathname)) return null;

  return (
    <footer className="shrink-0 border-t border-teal-900/10 py-3 text-center text-xs text-teal-900/60">
      {clinic.name} · {clinic.address}
    </footer>
  );
}
