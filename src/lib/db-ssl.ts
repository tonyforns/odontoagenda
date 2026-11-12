/** Supabase (y casi todo Postgres managed) exige SSL también en local. */
export function shouldUseSsl(connectionString: string | undefined): boolean {
  if (!connectionString) return false;
  const url = connectionString.toLowerCase();
  if (url.includes("sslmode=disable")) return false;
  if (url.includes("supabase.co")) return true;
  if (url.includes("sslmode=require") || url.includes("sslmode=verify")) {
    return true;
  }
  return process.env.NODE_ENV === "production";
}
