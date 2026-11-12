# Supabase (etapa 1: Postgres)

Auth de la app: **Auth.js + Gmail** (no Supabase Auth).  
Datos: **Postgres de Supabase** vía `DATABASE_URL` + `pg`.  
Roles: tabla `clinic_staff` (`admin` / `medico` / `secretaria`); paciente = sin fila.

## 1. Proyecto

1. [supabase.com](https://supabase.com) → tu proyecto (`ncqnzrdbxvcxkyhruwhf` si ya lo creaste).
2. **Settings → Database → Connection string → URI**.
3. Preferí el **pooler** (puerto `6543`, Transaction mode) para Vercel y redes solo IPv4.
   - El host `db.*.supabase.co:5432` suele ser **solo IPv6** y falla con `ENOTFOUND` en muchas PCs/Vercel.
   - Usuario del pooler: `postgres.<project-ref>` (no solo `postgres`).
4. Reemplazá la password. `sslmode=require` en la URI es ok; el código fuerza SSL sin verify-full.

## 2. Variables

### Local (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-....pooler.supabase.com:6543/postgres?sslmode=require
```

### Vercel

Las mismas tres (Production) + **Redeploy**.

## 3. Schema

En **SQL Editor** de Supabase, ejecutá en orden:

1. `migrations/002_doctors_patients_appointments.sql`
2. `migrations/003_patient_calendar.sql`
3. `migrations/004_clinic_staff.sql`

Al primer request con `DATABASE_URL`, `ensureSchema()` también intenta aplicar DDL.

## 4. Verificar

- Local: `pnpm dev` → reservar un turno → Table Editor → `appointments` / `patients`.
- Sin `DATABASE_URL` (solo local): JSON en `.data/` — no usar eso en Vercel.

## 5. Helpers JS (opcionales)

- `src/lib/supabase/client.ts` — browser  
- `src/lib/supabase/server.ts` — server  

No hay middleware de Supabase Auth a propósito (evita chocar con Auth.js).

## 6. No hacer todavía

- RLS por rol en Supabase  
- Reemplazar Auth.js por Supabase Auth  
- Exponer `service_role` al client  

