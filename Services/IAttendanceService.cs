using FourRootsKiosk.Models;

namespace FourRootsKiosk.Services;

/// <summary>
/// Fuente de datos de la ficha de asistencia de un colaborador.
/// </summary>
public interface IAttendanceService
{
    /// <summary>
    /// Devuelve la ficha de asistencia (faltas, puntualidad, horas extra y ascensos)
    /// del colaborador indicado. Si el id no existe, devuelve la ficha de ejemplo.
    /// </summary>
    AttendanceViewModel GetEmployeeSheet(string employeeId);
}
