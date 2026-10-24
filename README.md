# Kiosco Eslabon

Portal de autoservicio de RR. HH. dividido en dos partes independientes:

```
backend/    API REST (Node.js + Express + SQL Server). Responde solo JSON.
frontend/   Páginas estáticas (HTML + CSS + JS). Consumen el API; no necesitan Node para servirse.
```

## Cómo ejecutar el proyecto (local)

Todo se corre en local; no hace falta alojar la API en ningún dominio.

### Requisitos
- Node.js 18 o superior.
- Acceso a una base de datos SQL Server (local o remota) con los datos del Kiosco.

### Pasos

```bash
cd backend
npm install
cp .env.example .env     # completa DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
```

Edita `.env` y, para desarrollo local, deja (o ajusta):

```
PORT=3000
NODE_ENV=development
SERVE_FRONTEND=true
```

Luego levanta el servidor:

```bash
npm run dev     # o: npm start (ambos usan nodemon, con recarga automática)
```

Abre http://localhost:3000 en el navegador. Por defecto el backend **también sirve la carpeta `frontend/`**,
así que con un solo comando tienes API y páginas funcionando — no es necesario levantar un servidor aparte para el frontend.
Cualquier página protegida sin sesión redirige a `login.html`.

## Estructura

```
backend/
  server.js            arranque (carga .env y escucha en PORT)
  app.js               aplicación Express: CORS, sesión, rutas /api, frontend opcional, errores
  db.js                conexión a SQL Server
  routes/index.js      todas las rutas de /api
  controllers/         una función por endpoint
  models/              acceso a datos (SQL)
  middleware/          requireAuth (401 en JSON) y csrf
  helpers/             festivos, fechas, tipos de incidencia, validación de contraseña
  .env.example         variables de entorno documentadas
frontend/
  index.html, login.html, dashboard.html, attendance.html, avatar.html,
  engage.html, vacations.html, incidences.html
  css/                 estilos (theme.css = temas de color y daltonismo)
  js/
    config.js          API_BASE: dónde está el API  <-- se edita al desplegar
    api.js             cliente del API (window.Portal): CSRF, 401 -> login
    guard-init.js      oculta la página hasta comprobar la sesión
    theme-init.js, portal-tools.js   temas, daltonismo y lectura en voz alta
    <página>.js        lógica de cada página
```

Los enlaces del frontend son relativos (`dashboard.html`), así que puede alojarse en la raíz de un dominio o en una subcarpeta.

## API

Todo cuelga de `/api`. Las peticiones que modifican datos exigen sesión y la cabecera `X-CSRF-Token`
(el token se obtiene en `GET /api/auth/csrf`; `frontend/js/api.js` lo hace solo).

| Método y ruta | Descripción |
|---|---|
| `GET /api/health` | Comprobación de que el servicio está vivo |
| `GET /api/auth/csrf` · `GET /api/auth/session` | Token CSRF · usuario de la sesión (401 si no hay) |
| `POST /api/auth/login` · `POST /api/auth/logout` | `{ username, password, rememberMe }` |
| `GET /api/dashboard` | Módulos, apps (`page` = página del frontend) y nº de empleados |
| `GET /api/attendance` | Ficha de asistencia del usuario en sesión (antigüedad y ascensos reales; faltas/tardanzas en 0 hasta que exista un Kardex real) |
| `GET /api/avatar[/:id]` | Avatar y catálogos del editor (datos de ejemplo; no hay tabla de avatar en la BD) |
| `GET /api/engage` | Feed, encuestas, aplausos y cumpleaños de la comunidad |
| `GET /api/vacations` · `POST /api/vacations/requests` | Saldo y calendario · solicitar días `{ days: ["YYYY-MM-DD"] }` |
| `GET /api/incidences` · `POST /api/incidences/requests` · `POST /api/incidences/requests/:id/cancel` | Permisos |
| `GET /api/notifications` · `PATCH /api/notifications/read-all` · `PATCH /api/notifications/:id/read` | Bandeja del usuario |

Los errores siempre son `{ "error": "mensaje" }` con el código HTTP correspondiente.

## Despliegue

Variables de entorno (ver `backend/.env.example`): `DB_*`, `PORT`, `NODE_ENV=production`,
`SESSION_SECRET` (**obligatoria en producción**), `TRUST_PROXY`, `SERVE_FRONTEND`, `CORS_ORIGIN`, `COOKIE_SAMESITE`.

### Un solo servidor (lo más simple)
El backend sirve el frontend. Arranca con `NODE_ENV=production npm start` (idealmente con pm2 o systemd) y,
si pones Nginx delante, haz proxy de todo a `127.0.0.1:PORT` con `TRUST_PROXY=1`. `frontend/js/config.js` se queda con `API_BASE: ""`.

