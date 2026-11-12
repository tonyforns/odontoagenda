import { NextResponse } from "next/server";
import { getPool, hasDatabaseUrl, resetDatabaseAvailabilityForTests } from "@/lib/db";

/** Diagnóstico seguro de conexión Postgres (sin filtrar la URI completa). */
export async function GET() {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({
      ok: false,
      hasDatabaseUrl: false,
      error: "DATABASE_URL no está definida",
    });
  }

  const raw = process.env.DATABASE_URL ?? "";
  const hostMatch = raw.match(/@([^/:?]+)/);
  const host = hostMatch?.[1] ?? null;
  const usesPooler = Boolean(host?.includes("pooler.supabase.com"));
  const usesDirectDb = Boolean(host?.startsWith("db.") && host?.endsWith(".supabase.co"));

  resetDatabaseAvailabilityForTests();

  try {
    const { rows } = await getPool().query("select 1 as ok");
    return NextResponse.json({
      ok: true,
      hasDatabaseUrl: true,
      host,
      usesPooler,
      usesDirectDb,
      result: rows[0]?.ok ?? null,
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    return NextResponse.json(
      {
        ok: false,
        hasDatabaseUrl: true,
        host,
        usesPooler,
        usesDirectDb,
        errorCode: err.code ?? null,
        error: String(err.message ?? error).slice(0, 240),
        hint: usesDirectDb
          ? "En Vercel usá el pooler (aws-0-….pooler.supabase.com:6543) con usuario postgres.<project-ref>. El host db.* suele ser solo IPv6."
          : null,
      },
      { status: 500 },
    );
  }
}
