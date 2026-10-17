# Kiosco Eslabon

Portal de autoservicio de RR. HH. dividido en dos partes independientes:

```
backend/    API REST (Node.js + Express + SQL Server). Responde solo JSON.
frontend/   Páginas estáticas (HTML + CSS + JS). Consumen el API; no necesitan Node para servirse.
```

## Desarrollo local

```bash
cd backend
npm install
cp .env.example .env     # completa DB_* (y PORT si quieres)
npm run dev              # nodemon; con `npm start` corre sin recarga
```

Abre http://localhost:3000. Por defecto el backend **también sirve la carpeta `frontend/`**, así que no hace falta nada más.
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

### A) Un solo servidor (lo más simple)
El backend sirve el frontend. Arranca con `NODE_ENV=production npm start` (idealmente con pm2 o systemd) y,
si pones Nginx delante, haz proxy de todo a `127.0.0.1:PORT` con `TRUST_PROXY=1`. `frontend/js/config.js` se queda con `API_BASE: ""`.

### B) API aparte, frontend estático en el mismo dominio (recomendado con Nginx)
Backend con `SERVE_FRONTEND=false` y `TRUST_PROXY=1`; Nginx sirve `frontend/` y reenvía `/api` al backend.
`API_BASE` sigue siendo `""` (mismo origen, no hace falta CORS):

```nginx
server {
    listen 443 ssl;
    server_name kiosko.midominio.com;

    root /var/www/kiosko/frontend;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / { try_files $uri $uri.html $uri/ =404; }
}
```

### C) API y frontend en dominios distintos
En el frontend: `API_BASE: "https://api.midominio.com"`. En el backend: `SERVE_FRONTEND=false`,
`CORS_ORIGIN=https://app.midominio.com` y, si los dominios no comparten el mismo sitio, `COOKIE_SAMESITE=none` (exige HTTPS).

### Notas para producción
- Las sesiones se guardan **en memoria**: se pierden al reiniciar y solo sirven con una instancia. Para varias instancias, cambia el store de `express-session` (Redis o SQL Server).
- `helpers/password.js` está pendiente de implementar el cifrado del sistema original.
- El inicio de sesión no tiene límite de intentos; conviene añadirlo (p. ej. `express-rate-limit`) antes de publicar.
