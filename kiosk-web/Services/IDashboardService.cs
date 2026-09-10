using kiosk_web.Models;

namespace kiosk_web.Services;

/// <summary>
/// Fuente de datos de la ficha de asistencia de un colaborador.
/// </summary>
public interface IDashboardService
{
    /// <summary>
    /// Devuelve la ficha de asistencia (faltas, puntualidad, horas extra y ascensos)
    /// del colaborador indicado. Si el id no existe, devuelve la ficha de ejemplo.
    /// </summary>
    DashboardViewModel GetEmployeeSheet(string employeeId);
}
