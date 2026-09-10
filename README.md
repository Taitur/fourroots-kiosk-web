# Kiosco Eslabon — MVC (mock)

Backend ASP.NET Core MVC (.NET 8) — Login + Dashboard con datos mock, sesión en memoria (sin base de datos).

## Correr
```
dotnet restore
dotnet run
```
Abre https://localhost:5001 (o el puerto que indique la consola). Cualquier usuario/contraseña no vacíos inicia sesión.

## Estructura
- `Controllers/AccountController.cs` — login/logout (sesión)
- `Controllers/DashboardController.cs` — dashboard (requiere sesión)
- `Controllers/NotificationsController.cs` — API mock (`/api/notifications`)
- `Services/MockDataService.cs` — módulos, apps y notificaciones falsas
- `Views/Account/Login.cshtml`, `Views/Dashboard/Index.cshtml`
- `wwwroot/` — CSS y JS del cliente

Migrado desde una versión previa en Node/Express con el mismo alcance (Login + Dashboard, mock API). Para conectarlo a datos reales, reemplaza `MockDataService` por servicios que consulten tu base de datos / API de Eslabón Cloud.
