# Mockup temporal — RETIRADO

El modo demo en memoria / ficha auto / banner fue **eliminado** (2026-11-12) tras conectar Supabase.

- Persistencia: `DATABASE_URL` → Postgres (Supabase) vía `pg`
- Sin `DATABASE_URL` (solo local): JSON en `.data/store.json` (vacío + doctor). Demos densas: `pnpm seed:volume`
- Auth: Auth.js + Gmail (sin cambios)

Roles (médico / admin / secretaria / paciente): etapa futura.
