/** Origen público de la app (Vercel / AUTH_URL / headers del request). */
export function resolvePublicOrigin(input?: {
  authUrl?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
}): string {
  const fromEnv = (input?.authUrl ?? process.env.AUTH_URL)?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      // ignore invalid AUTH_URL
    }
  }

  const host = (input?.forwardedHost || input?.host || "").split(",")[0]?.trim();
  if (host) {
    const proto =
      input?.forwardedProto?.split(",")[0]?.trim() ||
      (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return "http://localhost:3847";
}

export function googleOAuthCallbackUrl(origin?: string): string {
  const base = (origin ?? resolvePublicOrigin()).replace(/\/$/, "");
  return `${base}/api/auth/callback/google`;
}
