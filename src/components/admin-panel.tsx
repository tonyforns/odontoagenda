"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import type { ClinicStaff, StaffRole } from "@/lib/types";
import { canDeactivateStaff } from "@/lib/staff-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "medico", label: "Médico" },
  { value: "secretaria", label: "Secretaria" },
];

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function AdminPanel() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("secretaria");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saving, startSave] = useTransition();

  async function refreshStaff() {
    const res = await fetch("/api/admin/staff");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo cargar el personal");
      setLoaded(false);
      return;
    }
    setStaff(data.staff ?? []);
    setError(null);
    setLoaded(true);
  }

  useEffect(() => {
    if (status !== "authenticated" || !isAdmin) return;
    startTransition(() => {
      void refreshStaff();
    });
  }, [status, isAdmin]);

  function submitStaff(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startSave(async () => {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "No se pudo guardar");
        return;
      }
      setEmail("");
      setRole("secretaria");
      await refreshStaff();
    });
  }

  function patchMember(
    member: ClinicStaff,
    patch: { active?: boolean; role?: StaffRole },
  ) {
    startSave(async () => {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar");
        return;
      }
      setError(null);
      await refreshStaff();
    });
  }

  if (status === "loading") {
    return (
      <p className="flex h-full items-center justify-center gap-2 text-sm text-teal-900/70">
        <Loader2 className="size-4 animate-spin" /> Cargando sesión…
      </p>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto flex h-full max-w-sm flex-col justify-center space-y-3 p-4">
        <p className="text-sm text-teal-900/80">
          Iniciá sesión con Gmail para el panel de administración.
        </p>
        <Button
          type="button"
          className="bg-teal-800 hover:bg-teal-900"
          onClick={() =>
            signIn("google", { callbackUrl: "/admin", redirect: true })
          }
        >
          Iniciar sesión
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex h-full max-w-sm flex-col justify-center space-y-3 p-4">
        <p className="text-sm text-teal-900/80">
          Solo administradores pueden entrar acá.
        </p>
        <p className="text-xs text-teal-900/55">{session.user?.email}</p>
        <Button asChild variant="outline" className="border-teal-900/15">
          <Link href="/consultorio">Ir al consultorio</Link>
        </Button>
      </div>
    );
  }

  if (!loaded || pending) {
    return (
      <div className="mx-auto flex h-full max-w-sm flex-col justify-center space-y-3 p-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <p className="flex items-center justify-center gap-2 text-sm text-teal-900/70">
          <Loader2 className="size-4 animate-spin" /> Cargando administración…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
      <form
        onSubmit={submitStaff}
        className="shrink-0 space-y-3 rounded-xl border border-teal-900/10 bg-white/90 p-3 sm:p-4"
      >
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg text-teal-950">
            Agregar personal
          </h2>
          <p className="text-xs text-teal-900/55">
            El Gmail debe coincidir con la cuenta con la que inician sesión.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">Email Gmail</Label>
            <Input
              id="staff-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@gmail.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-role">Rol</Label>
            <select
              id="staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className={selectClassName}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-teal-800 hover:bg-teal-900 sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Guardando…
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
        {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
      </form>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-teal-900/10 bg-white/90">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="sticky top-0 bg-teal-50/95 text-xs uppercase tracking-wide text-teal-900/55 backdrop-blur">
            <tr>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Rol</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => {
              const mayDeactivate = canDeactivateStaff(member);
              return (
                <tr
                  key={member.id}
                  className="border-b border-teal-900/5 last:border-0"
                >
                  <td className="px-3 py-2 font-medium text-teal-950">
                    {member.email}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Rol de ${member.email}`}
                      value={member.role}
                      disabled={saving}
                      className={cn(selectClassName, "h-8 max-w-[9.5rem]")}
                      onChange={(e) =>
                        patchMember(member, {
                          role: e.target.value as StaffRole,
                        })
                      }
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                        member.active
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-teal-900/5 text-teal-900/50",
                      )}
                    >
                      {member.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {member.active && !mayDeactivate ? (
                      <span
                        className="text-xs text-teal-900/45"
                        title="No se puede desactivar a un administrador"
                      >
                        —
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-teal-800"
                        disabled={saving}
                        onClick={() =>
                          patchMember(member, { active: !member.active })
                        }
                      >
                        {member.active ? "Desactivar" : "Activar"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
