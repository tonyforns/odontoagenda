# OdontoAgenda

App web de gestión de turnos para un consultorio odontológico: el paciente reserva horarios libres, el turno se asocia a **DNI + fecha de nacimiento**, se sincroniza con el **Google Calendar del profesional** y el paciente puede agregarlo al suyo (enlace Google o archivo `.ics`). También puede **cancelar** o **reprogramar**.

## Cómo usarla

```bash
npm install
npm run dev -- -p 3847
```

Abrí `http://localhost:3847`.

| Ruta | Uso |
|------|-----|
| `/` | Inicio |
| `/reservar` | Pedir turno |
| `/mis-turnos` | Buscar por DNI + nacimiento, cancelar/reprogramar, agregar al calendario |
| `/admin` | Agenda del consultorio (PIN demo: `aurora`) |

Datos de ejemplo precargados: DNI `30111222`, nacimiento `1990-05-12`.

## Stack recomendado (y el que usamos)

| Capa | Tecnología | Por qué |
|------|------------|---------|
| App web full-stack | **Next.js (App Router) + TypeScript** | Una sola base para UI y API; Route Handlers para reservas y sync |
| UI | **Tailwind CSS + shadcn/ui** | Formularios y paneles rápidos, accesibles y consistentes |
| Validación | **Zod** | Validar DNI, fechas y payloads en el servidor |
| Fechas | **date-fns / date-fns-tz** | Franjas horarias en `America/Argentina/Buenos_Aires` |
| Calendario doctor | **Google Calendar API + OAuth2 (refresh token)** | Insertar/actualizar/borrar eventos en la cuenta Gmail del profesional |
| Calendario paciente | **URL “Add to Google Calendar” + `.ics`** | No hace falta que el paciente inicie sesión con Google |
| Persistencia | **Postgres** (publicado) / **JSON local** (dev) | Turnos durables entre sesiones; `cursor-app.json` declara la DB |
| Secretos | Variables de entorno | Credenciales Google y PIN del consultorio nunca van al cliente |

### Alternativas evaluadas

- **Cal.com / Calendly**: excelentes para agendas genéricas, pero más difíciles de adaptar a identidad por DNI argentino y flujo de consultorio propio.
- **Service Account de Google**: útil en Google Workspace con domain-wide delegation; para un Gmail personal de un odontólogo conviene más **OAuth del profesional** con refresh token.
- **Auth completa de pacientes**: innecesaria para el MVP; DNI + fecha de nacimiento alcanza para autogestión clínica liviana (con token de gestión por turno).

## Cómo implementamos el flujo

1. **Disponibilidad**: lun–vie, 09–12 y 15–18, turnos de 30 minutos (`src/lib/clinic.ts` + `src/lib/slots.ts`).
2. **Reserva**: `POST /api/appointments` valida datos, chequea solapamientos, guarda el turno y llama a Google Calendar (o modo demo).
3. **Doctor**: si existen `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN`, se crea/actualiza/borra el evento; si no, modo mock transparente en la UI.
4. **Paciente**: tras confirmar, botones para Google Calendar y descarga `.ics`.
5. **Gestión**: con DNI + nacimiento se listan turnos; cancelar/reprogramar exige el `manageToken` del turno.
6. **Consultorio**: `/admin` protegido con `DOCTOR_PIN` (demo: `aurora`).

## Secretos (producción)

Configurá en el hosting / Cursor Secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID` (opcional, default `primary`)
- `DOCTOR_PIN`

Sin Google, la app sigue funcionando con datos de ejemplo y sincronización simulada.

### Obtener el refresh token del doctor (una sola vez)

1. Creá un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Habilitá **Google Calendar API**.
3. Creá credenciales OAuth (app web) y agregá el redirect URI de tu entorno.
4. Autorizá con la cuenta Gmail del profesional, scope `https://www.googleapis.com/auth/calendar`.
5. Guardá el `refresh_token` como secreto `GOOGLE_REFRESH_TOKEN`.

## Scripts

- `npm run dev -- -p 3847` — desarrollo
- `npm run build` — build de producción
- `npm start -- -p 3847` — servir build
