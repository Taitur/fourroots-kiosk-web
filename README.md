# Kiosco Eslabon — MVC

Node.js + Express con patrón MVC, vistas EJS y base de datos SQL Server (`mssql`).

## Correr
```
npm install
npm start        # nodemon; o: npm run dev
```
Crea un `.env` en la raíz con `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` y opcionalmente `PORT` y `SESSION_SECRET`.

## Estructura
- `app.js` — configuración de Express (dotenv, EJS, estáticos, sesión) y arranque
- `db.js` — conexión a SQL Server
- `routes/index.js` — rutas (`/{Controlador}/{Acción}/{id?}`)
- `controllers/` — lógica de cada página
- `models/` — acceso a datos
  - `userModel.js` — login (`kio_tbUsuarios`, nombre desde `recursos`, rol admin desde `parametros`)
  - `dashboardModel.js` — secciones y apps del dashboard (fijas) y conteo de `empleados`
  - `notificationModel.js` — bandeja del usuario (`kio_tbMensajes`)
  - `vacationModel.js` — saldo y solicitudes de vacaciones (`kio_tbSolicitudesUsuarios` + `kio_tbSolVacaciones`)
  - `incidenceModel.js` — permisos/incidencias (`kio_tbSolicitudesUsuarios` + `kio_tbAvisosMultiples` + `kio_tbEventosSolAvisos`)
  - `attendanceModel.js`, `avatarModel.js` — **datos de ejemplo** (la BD no tiene tablas para esto)
- `helpers/incidenceTypes.js` — tipos de incidencia/permiso (catálogo en código: la BD no lo tiene) y `helpers/dates.js` — utilidades de fechas
- `helpers/holidays.js` — festivos oficiales (LFT art. 74), usados por el calendario de vacaciones
- `helpers/password.js` — validación de contraseña contra `vcClave` (**pendiente: cifrado del sistema original**)
- `middleware/` — `requireAuth.js` (sesión; la API responde 401) y `csrf.js`
- `views/` — plantillas EJS; `views/partials/` hace de layout
- `public/` — CSS y JS del cliente
  - `css/theme.css` + `js/theme-init.js` — temas de color y daltonismo (se guardan en `localStorage` y se aplican en todas las páginas)
  - `js/portal-tools.js` — panel de temas y lectura en voz alta del encabezado del dashboard (Web Speech API)

Las apps del dashboard se definen en `MODULES` de `models/dashboardModel.js`; sólo las que tienen `url` (módulos ya implementados) son accesibles.
