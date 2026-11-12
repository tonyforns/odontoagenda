import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { SiteFooter } from "@/components/site-footer";
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
      <body className="clinic-shell flex h-full flex-col overflow-hidden font-sans text-teal-950">
        <div className="clinic-grid pointer-events-none fixed inset-0 -z-10" />
        <AuthProvider>
          <SiteHeader />
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
