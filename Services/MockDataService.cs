using FourRootsKiosk.Models;

namespace FourRootsKiosk.Services;

// Servicio en memoria con datos falsos — MVP sin base de datos.
public class MockDataService
{
    public List<ModuleModel> Modules { get; } = new()
    {
        new ModuleModel {
            Id = "nomina", Title = "Nómina", Description = "Gestión de pagos y compensaciones",
            Icon = "payments", Gradient = "linear-gradient(135deg,#10B981,#0D9488)",
            Apps = new() {
                new AppModel { Id = "calc", Name = "Cálculo de Nómina", Desc = "Proceso quincenal y mensual", Icon = "calculate" },
                new AppModel { Id = "recibos", Name = "Recibos CFDI", Desc = "Emisión y timbrado digital", Icon = "receipt_long" },
                new AppModel { Id = "prestamos", Name = "Préstamos", Desc = "Solicitudes y descuentos", Icon = "account_balance" },
            }
        },
        new ModuleModel {
            Id = "capital", Title = "Capital Humano", Description = "Talento y desarrollo organizacional",
            Icon = "groups", Gradient = "linear-gradient(135deg,#3B82F6,#7C3AED)",
            Apps = new() {
                new AppModel { Id = "reclu", Name = "Reclutamiento", Desc = "Proceso de contratación", Icon = "person_add" },
                new AppModel { Id = "evaluaciones", Name = "Evaluaciones", Desc = "Desempeño y objetivos", Icon = "insights" },
                new AppModel { Id = "capacitacion", Name = "Capacitación", Desc = "Cursos y certificaciones", Icon = "school" },
            }
        },
        new ModuleModel {
            Id = "tiempo", Title = "Tiempo y Accesos", Description = "Asistencia y control de acceso",
            Icon = "schedule", Gradient = "linear-gradient(135deg,#F59E0B,#EA580C)",
            Apps = new() {
                new AppModel { Id = "asist", Name = "Asistencia", Desc = "Registro y seguimiento", Icon = "fact_check" },
                new AppModel { Id = "horar", Name = "Horarios", Desc = "Turnos y calendarios", Icon = "calendar_month" },
                new AppModel { Id = "vacaciones", Name = "Vacaciones", Desc = "Solicitudes y saldo", Icon = "beach_access" },
            }
        },
    };

    public List<NotificationModel> Notifications { get; } = new()
    {
        new NotificationModel { Id = "n1", Title = "Recibo de nómina disponible", Desc = "Quincena 1 - Septiembre", Time = "Hace 2 h", Read = false, ModuleId = "nomina" },
        new NotificationModel { Id = "n2", Title = "Nueva vacante por aprobar", Desc = "Analista de Capital Humano", Time = "Hace 5 h", Read = false, ModuleId = "capital" },
        new NotificationModel { Id = "n3", Title = "Solicitud de vacaciones aprobada", Desc = "12 - 16 de septiembre", Time = "Ayer", Read = false, ModuleId = "tiempo" },
        new NotificationModel { Id = "n4", Title = "Checada olvidada", Desc = "Registra tu entrada del día 5", Time = "Hace 2 días", Read = true, ModuleId = "tiempo" },
    };
}
