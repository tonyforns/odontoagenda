# OdontoAgenda

App web de gestión de turnos para un consultorio odontológico: el paciente **inicia sesión con Gmail** para reservar, completa **DNI + fecha de nacimiento**, el turno se sincroniza con el **Google Calendar del profesional** y el paciente puede agregarlo al suyo (enlace Google o archivo `.ics`). También puede **cancelar** o **reprogramar**.

## Cómo usarla

```bash
pnpm install
pnpm dev
```

Abrí `http://localhost:3847`.

| Ruta | Uso |
|------|-----|
| `/` | Inicio |
| `/reservar` | Pedir turno (requiere login con Gmail) |
| `/mis-turnos` | Login Gmail: cancelar/reprogramar, agregar al calendario |
| `/consultorio` | Agenda, pacientes y fichas (roles staff) |
| `/admin` | Panel administrador: personal y roles (solo `admin`) |

Datos de ejemplo precargados: DNI `30111222`, nacimiento `1990-05-12`.

## Stack recomendado (y el que usamos)

| Capa | Tecnología | Por qué |
|------|------------|---------|
| App web full-stack | **Next.js (App Router) + TypeScript** | Una sola base para UI y API; Route Handlers para reservas y sync |
| UI | **Tailwind CSS + shadcn/ui** | Formularios y paneles rápidos, accesibles y consistentes |
| Validación | **Zod** | Validar DNI, fechas y payloads en el servidor |
| Fechas | **date-fns / date-fns-tz** | Franjas horarias en `America/Argentina/Buenos_Aires` |
| Calendario doctor | **Google Calendar API + OAuth2 (refresh token)** | Insertar/actualizar/borrar eventos en la cuenta Gmail del profesional |
| Login paciente | **Auth.js (NextAuth) + Google** | Reserva solo con sesión Gmail; el email lo fija el servidor |
| Calendario paciente | **URL “Add to Google Calendar” + `.ics`** | Tras reservar, sumar el evento sin OAuth adicional |
| Persistencia | **Postgres** (publicado) / **JSON local** (dev) | Schema: `doctors`, `patients`, `appointments`, `clinic_staff` |
| Secretos | Variables de entorno | Credenciales Google y `DATABASE_URL` nunca van al cliente |

### Alternativas evaluadas

- **Cal.com / Calendly**: excelentes para agendas genéricas, pero más difíciles de adaptar a identidad por DNI argentino y flujo de consultorio propio.
- **Service Account de Google**: útil en Google Workspace con domain-wide delegation; para un Gmail personal de un odontólogo conviene más **OAuth del profesional** con refresh token.

## Cómo implementamos el flujo

1. **Login**: en `/reservar` el paciente entra con Gmail (Auth.js). Sin sesión, `POST /api/appointments` responde 401.
2. **Disponibilidad**: franjas por día en `doctor_schedule_windows` (seed lun–vie 09–12 y 15–18, turnos de 30 min).
3. **Reserva**: valida datos + DNI, guarda el turno con el email de la sesión y llama a Google Calendar (o modo demo).
4. **Doctor**: si existen `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN`, se crea/actualiza/borra el evento; si no, modo mock transparente en la UI.
5. **Paciente**: tras confirmar, botones para Google Calendar y descarga `.ics`.
6. **Gestión**: `/mis-turnos` con sesión Gmail; cancelar/reprogramar exige el `manageToken` del turno.
7. **Consultorio**: `/consultorio` para roles staff (`admin` / `medico` / `secretaria`) tras login Gmail; pestañas Agenda, Pacientes (alta de ficha) y Horarios.
8. **Admin**: `/admin` solo rol `admin` — alta/baja de personal en `clinic_staff`.
9. **Schema**: `doctors` ← `appointments` → `patients` + `clinic_staff` + `doctor_schedule_windows` (`migrations/002`–`005`).

## Secretos (producción)

Configurá en el hosting / Cursor Secrets:

- `AUTH_SECRET`
- `AUTH_URL` (ej. `https://tu-dominio`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (login paciente; también sirven `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`)
- `GOOGLE_REFRESH_TOKEN` (calendario del doctor)
- `GOOGLE_CALENDAR_ID` (opcional, default `primary`)
- `DATABASE_URL` (Postgres de Supabase; obligatorio en producción)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (client helpers)
- `STAFF_MEDICO_EMAIL` (opcional: Gmail del médico → rol `medico`)
- Setup: `docs/SUPABASE.md`
- Roles: `clinic_staff` (`admin` seed `iaforns@gmail.com`; paciente = sin fila)

Redirect URI de login paciente: `{AUTH_URL}/api/auth/callback/google`  
- Local: `http://localhost:3847/api/auth/callback/google`  
- Vercel: `https://odontoagenda.vercel.app/api/auth/callback/google` (y `AUTH_URL=https://odontoagenda.vercel.app`).

Sin Calendar del doctor, la reserva sigue funcionando (sync en modo demo). **Sin Client ID/Secret no se puede iniciar sesión con Gmail.**

### Obtener el refresh token del doctor (una sola vez)

1. Creá un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Habilitá **Google Calendar API** y configurá la pantalla de consentimiento OAuth.
3. Creá credenciales OAuth (app web) y agregá los redirect URI de login y de tu flujo de Calendar.
4. Autorizá con la cuenta Gmail del profesional, scope `https://www.googleapis.com/auth/calendar`.
5. Guardá el `refresh_token` como secreto `GOOGLE_REFRESH_TOKEN`.

## Scripts

- `pnpm dev` — desarrollo (puerto 3847)
- `pnpm build` — build de producción
- `pnpm start` — servir build (puerto 3847)
- `pnpm test` — tests (Vitest)
- `pnpm seed:volume` — carga pacientes/turnos demo (conserva datos reales)
- Historial de cambios: `docs/CHANGELOG.md`
