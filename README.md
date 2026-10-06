# Kiosco Eslabon — MVC (mock)

Backend Node.js + Express con patrón MVC y vistas EJS. Datos mock y sesión en memoria (sin base de datos).

## Correr
```
npm install
npm start        # o: npm run dev  (reinicia al guardar)
```
Abre http://localhost:3000 (configurable con la variable `PORT`). Cualquier usuario/contraseña no vacíos inicia sesión.

## Estructura
- `app.js` — configuración de Express (EJS, estáticos, sesión) y arranque
- `routes/index.js` — todas las rutas (`/{Controlador}/{Acción}/{id?}`, igual que la versión .NET)
- `controllers/` — lógica de cada página
  - `accountController.js` — login/logout (sesión)
  - `dashboardController.js` — dashboard
  - `attendanceController.js` — ficha de asistencia (`/Attendance/Index/:id`)
  - `avatarController.js` — editor "Mi Avatar"
  - `engageController.js`, `vacationsController.js` — páginas estáticas
  - `notificationsController.js` — API mock (`/api/notifications`)
- `models/` — datos de ejemplo (`mockDataModel.js`, `attendanceModel.js`, `avatarModel.js`)
- `middleware/` — `requireAuth.js` (exige sesión) y `csrf.js` (token anti-CSRF del login)
- `views/` — plantillas EJS; `views/partials/` hace de layout compartido
- `public/` — CSS y JS del cliente

Para conectarlo a datos reales, reemplaza las funciones de `models/` por consultas a tu base de datos / API de Eslabón Cloud; los controladores y las vistas no cambian.

Variables de entorno opcionales: `PORT`, `SESSION_SECRET`, `NODE_ENV=production` (cookie `secure` y redirección al login ante errores).
