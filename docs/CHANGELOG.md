# Changelog

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
