# Changelog

## 2026-11-12 (seed pacientes en Postgres)

- `pnpm seed:volume` usa `DATABASE_URL` si existe (pacientes/turnos demo); si no, sigue en `.data/store.json`.

## 2026-11-12 (pacientes paginados)

- Listado de Pacientes en consultorio: paginación de 10 (sin scroll infinito).

## 2026-11-12 (ficha desde turno vs pacientes)

- Desde **Agenda/turno**: ficha solo lectura + **Cancelar turno**.
- Desde **Pacientes**: botón **Editar** (email no editable).
- `PATCH /api/admin/appointments/[id]` con `{ action: "cancel" }`.

## 2026-11-12 (editar ficha paciente en consultorio)

- Ficha editable desde Pacientes; `PATCH /api/admin/patients/[id]`.

## 2026-11-12 (admin: editar rol, no desactivar admin)

- En `/admin` se puede cambiar el rol de cada miembro desde la tabla.
- No se puede desactivar a un administrador (UI + API).

## 2026-11-12 (rutas consultorio / admin)

- Agenda del profesional: `/consultorio` (antes `/admin`).
- Nuevo `/admin`: gestión de personal y roles (solo rol `admin`).
- APIs `GET/POST /api/admin/staff` y `PATCH /api/admin/staff/[id]`.
- Nav: Consultorio para staff; Admin solo para administradores.

## 2026-11-12 (roles + sin PIN)

- Tabla `clinic_staff` (`migrations/004` + `ensureSchema`): roles `admin` / `medico` / `secretaria`.
- Seed admin: `iaforns@gmail.com`; médico opcional vía `STAFF_MEDICO_EMAIL`.
- `/admin` y APIs admin por sesión Gmail + rol staff; eliminado flujo PIN / `x-doctor-pin`.
- Sesión Auth.js expone `role` (+ `doctorId` si médico); nav Consultorio solo para staff.
- Regla agentes: `.cursor/rules/schema-db-sync.mdc` (migraciones + ensureSchema + tipos).

## 2026-11-12 (mock retirado)

- Eliminado modo demo en memoria, ficha auto-mock y banner de Reservar.
- Producción usa solo Supabase (`DATABASE_URL`); `seed:volume` queda para demos locales.

## 2026-11-12 (Supabase etapa 1)

- Paquetes `@supabase/supabase-js` / `@supabase/ssr` + helpers `src/lib/supabase/*`.
- `DATABASE_URL` con SSL automático para hosts Supabase; guía en `docs/SUPABASE.md`.
- Auth.js se mantiene; sin roles ni Supabase Auth todavía.

## 2026-11-12 (mock temporal documentado)

- `docs/MOCKUP-TEMPORAL.md`: checklist de qué borrar al integrar Supabase.
- Home: imagen del hero restaurada; nav oculta Mis turnos/Consultorio sin login.

## 2026-11-12 (login Gmail issuer)

- Google OAuth: `issuer` + `token`/`userinfo` explícitos (evita Configuration por id_token).
- `/api/auth/status` expone `lastAuthError` para diagnosticar.

## 2026-11-12 (login Gmail Configuration)

- Provider Google simplificado; trim de secrets; mensaje de error más concreto.

## 2026-11-12 (login Gmail estable)

- En mock: login Google solo con `openid email profile` (sin Calendar).
- Errores OAuth visibles en `/reservar?error=…`.

## 2026-11-12 (auth Vercel)

- Auth.js: `secret` explícito + `signIn` no rompe si falla el store mock.
- Error OAuth redirige a `/reservar` (no página negra de Auth.js).

## 2026-11-11 (mock sacar turno)

- Sin DB: login Gmail real; ficha se completa sola (demo) y la reserva usa Calendar mock.
- Banner “modo demo” en Reservar.

## 2026-11-11 (OAuth Vercel)

- `/api/auth/status` expone el callback según `AUTH_URL` / host (no hardcode localhost).
- Home: hero a alto completo del main.

## 2026-11-11 (mock sin DB)

- Sin `DATABASE_URL` o si Postgres no conecta: usa mock en memoria con el seed volume (pacientes/turnos demo).
- En Vercel el store es siempre memoria (el JSON local no persiste ahí).

## 2026-03-11 (Vercel build)

- `allowBuilds.esbuild: true` para `pnpm install` en Vercel.
- `scripts/` excluido del `tsconfig` (evita TS5097 en `next build`).

## 2026-03-11 (header)

- Header con marca OA, nav en píldora con estado activo y “Salir” tipado (sin wrap en Mis turnos).

## 2026-03-11 (home restaurada)

- Inicio vuelve al hero original (sin bloque de features).
- Footer visible otra vez en `/`.

## 2026-03-11 (viewport en todas las secciones)

- Reservar y Mis turnos usan shell a altura de pantalla (sin scroll de página).
- Footer oculto en `/admin`, `/reservar` y `/mis-turnos`; scroll solo dentro del panel.

## 2026-03-11 (slots tamaño fijo)

- Filas de turno (libre/tomado) con altura fija para evitar saltos de layout en mobile.

## 2026-03-11 (asignar turno libre)

- Click en horario libre: asignar a paciente existente o crear ficha nueva.
- API `POST /api/admin/appointments` protegida con PIN del consultorio.

## 2026-03-11 (timeline del día)

- Turnos del día en timeline (mañana/tarde), bloque horario y chips de ficha.
- La agenda muestra **todos** los horarios del día: tomados y libres.

## 2026-03-11 (agenda por semanas)

- Agenda del consultorio: navegación semana a semana (lun–vie) con flechas.
- Botón de calendario junto al rango: elegís un día y salta a esa semana.

## 2026-03-11 (consultorio sin scroll de página)

- `/admin` ocupa el viewport: header compacto, sin footer, scroll solo en listas.
- Header global más bajo; chips de día y filas de turno más densos.

## 2026-03-11 (agenda por días)

- `/admin` → Agenda rediseñada: selector horizontal de días + listado horario del día.
- Click en un turno abre la ficha del paciente.

## 2026-03-11 (filtros pacientes)

- En `/admin` → Pacientes: búsqueda por nombre/DNI/teléfono/email.

## 2026-03-11 (seed volumen demo)

- Script `pnpm seed:volume` carga ~35 pacientes y ~72 turnos demo en `.data/store.json`.
- Conserva pacientes/turnos reales (no `seed-*`) al re-seedeár.
- Store vacío nuevo también arranca con volumen demo.

## 2026-03-11 (consultorio · pacientes)

- Panel `/admin`: pestaña **Pacientes** con listado del consultorio.
- Al seleccionar un paciente se abre la **ficha** (datos + historial de turnos).
- En agenda y listado, **toda la fila** abre la ficha del paciente.
- APIs con PIN: `GET /api/admin/patients` y `GET /api/admin/patients/[id]`.

## 2026-03-11

- Login de pacientes con Gmail (Auth.js) obligatorio para reservar.
- Schema `doctors` / `patients` / `appointments` (migraciones 002–003) y store JSON local.
- Calendario día-primero para elegir turno; ficha de paciente (DNI, nacimiento, etc.).
- Sync de turnos al Google Calendar del paciente (scope `calendar.events`) y del profesional.
- UI: logout en ícono del header; doctor Dr. Rafael Lovera; PIN admin `1752`.
- Fix OAuth: evitar error `iss missing` saltando discovery OIDC de Google.
- Proyecto migrado de npm a **pnpm** (`pnpm dev` en puerto **3847`).
- Reglas Cursor: documentar cambios, avisar contradicciones, tests obligatorios con Vitest.
