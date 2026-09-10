using FourRootsKiosk.Models;

namespace FourRootsKiosk.Services;

/// <summary>
/// Fuente de datos del avatar de un colaborador y de los catálogos
/// de opciones que ofrece el editor (cabello, rostro, ropa, accesorios y colores).
/// </summary>
public interface IAvatarService
{
    /// <summary>
    /// Devuelve el avatar guardado del colaborador indicado junto con los
    /// catálogos de opciones disponibles. Si el id no existe, devuelve el
    /// avatar de ejemplo.
    /// </summary>
    AvatarViewModel GetProfile(string employeeId);
}