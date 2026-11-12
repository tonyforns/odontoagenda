# Mockup temporal (quitar al integrar Supabase)

Este modo demo existe **solo** mientras no hay Postgres/Supabase en producción (p. ej. Vercel sin `DATABASE_URL`).

## Qué hay que borrar o revertir al conectar Supabase

1. **Modo mock**
   - `src/lib/mock-mode.ts` (+ `mock-mode.test.ts`)
   - Uso de `isMockBookingMode` / `preferMemoryStore` / `withMockCompleteProfile` en:
     - `src/lib/store.ts`
     - `src/lib/patients.ts`
     - `src/auth.ts` (scopes sin Calendar en mock)
     - `src/app/api/appointments/route.ts`
     - `src/app/api/auth/status/route.ts`
     - `src/components/booking-form.tsx` (banner “Modo demo”)

2. **Store en memoria / seed volume como fallback de producción**
   - En `src/lib/store.ts`: no usar memoria automática por `VERCEL=1`; con Supabase el camino es siempre `DATABASE_URL`.
   - `src/lib/demo-seed.ts` y `scripts/seed-volume.mts` pueden quedar **solo** para demos locales, no como fallback de deploy.

3. **Variables de entorno**
   - Quitar dependencia de: `ODONTO_MEMORY_STORE`, `ODONTO_MOCK_BOOKING`.
   - Obligatorio: `DATABASE_URL` (connection string de Supabase, SSL).

4. **Docs**
   - Actualizar `README.md` (sección secretos / mock).
   - Entrada en `docs/CHANGELOG.md` cuando se retire el mock.

## Qué NO borrar

- Login Gmail (Auth.js) — sigue siendo real.
- Schema SQL en `migrations/` — usarlo contra Supabase.
- Flujo de reserva / admin / ficha; solo deja de ser “demo en memoria”.

## Criterio de listo

Con Supabase: `useDatabase()` true, sin banner de modo demo, turnos y pacientes persistidos en Postgres.
