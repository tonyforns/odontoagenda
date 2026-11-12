import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente browser de Supabase (anon/publishable).
 * Auth de la app sigue en Auth.js; esto es para lectura/API futura.
 * No uses service_role acá.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return createBrowserClient(url, key);
}
