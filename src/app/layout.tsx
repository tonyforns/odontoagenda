import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { clinic } from "@/lib/clinic";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${clinic.brand} · Turnos odontológicos`,
  description:
    "Reservá, reprogramá o cancelá turnos del consultorio. Sincronización con Google Calendar del profesional.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="clinic-shell min-h-full flex flex-col font-sans text-teal-950">
        <div className="clinic-grid pointer-events-none fixed inset-0 -z-10" />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-teal-900/10 py-6 text-center text-sm text-teal-900/60">
          {clinic.name} · {clinic.address}
        </footer>
      </body>
    </html>
  );
}
