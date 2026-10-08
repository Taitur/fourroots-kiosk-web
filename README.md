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
  - `dashboardModel.js` — menú por permisos (`kio_tbTiposTransacciones`, `kio_tbTransacciones`, `kio_tbTransaccionesUsuarios`) y conteo de `empleados`
  - `notificationModel.js` — bandeja del usuario (`kio_tbMensajes`)
  - `vacationModel.js` — días usados (`kio_tbSolVacaciones`)
  - `attendanceModel.js`, `avatarModel.js` — **datos de ejemplo** (la BD no tiene tablas para esto)
- `helpers/password.js` — validación de contraseña contra `vcClave` (**pendiente: cifrado del sistema original**)
- `middleware/` — `requireAuth.js` (sesión; la API responde 401) y `csrf.js`
- `views/` — plantillas EJS; `views/partials/` hace de layout
- `public/` — CSS y JS del cliente

Las transacciones que ya tienen página propia se enlazan en `IMPLEMENTED_PAGES` de `models/dashboardModel.js`; el resto aparece como "Próximamente".
