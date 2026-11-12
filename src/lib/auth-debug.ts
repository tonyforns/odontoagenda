type AuthDebugError = {
  type: string;
  message: string;
  at: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __odontoLastAuthError: AuthDebugError | undefined;
}

export function rememberAuthError(error: unknown): void {
  const err = error as {
    type?: string;
    name?: string;
    message?: string;
    cause?: unknown;
  };
  globalThis.__odontoLastAuthError = {
    type: err?.type || err?.name || "Unknown",
    message: String(err?.message ?? error).slice(0, 300),
    at: new Date().toISOString(),
  };
}

export function getLastAuthError(): AuthDebugError | null {
  return globalThis.__odontoLastAuthError ?? null;
}
