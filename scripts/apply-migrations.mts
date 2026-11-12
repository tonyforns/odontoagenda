import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { shouldUseSsl } from "../src/lib/db-ssl";

async function loadDatabaseUrl(): Promise<string> {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  try {
    const raw = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    const line = raw
      .split(/\r?\n/)
      .find((l) => l.startsWith("DATABASE_URL="));
    if (!line) throw new Error("DATABASE_URL no está en .env.local");
    return line.slice("DATABASE_URL=".length).trim();
  } catch {
    throw new Error("Definí DATABASE_URL o agregala en .env.local");
  }
}

async function main() {
  // Evitar que sslmode=require del URI fuerce verify-full en pg nuevo.
  const rawUrl = await loadDatabaseUrl();
  const connectionString = rawUrl
    .replace(/[?&]sslmode=[^&]*/gi, "")
    .replace(/[?&]uselibpqcompat=[^&]*/gi, "")
    .replace(/\?&/, "?")
    .replace(/[?&]$/, "");
  const pool = new pg.Pool({
    connectionString,
    ssl: shouldUseSsl(rawUrl) ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const files = [
      "migrations/002_doctors_patients_appointments.sql",
      "migrations/003_patient_calendar.sql",
    ];
    for (const file of files) {
      const sql = await readFile(path.join(process.cwd(), file), "utf8");
      await pool.query(sql);
      console.log(`OK ${file}`);
    }
    const { rows } = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    console.log(
      "tables:",
      rows.map((r: { tablename: string }) => r.tablename).join(", "),
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
