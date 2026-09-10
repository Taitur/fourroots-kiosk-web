using Microsoft.AspNetCore.Mvc;
using kiosk_web.Services;

namespace kiosk_web.Controllers;

/// <summary>
/// Página "Mi Avatar": muestra el avatar guardado del colaborador y el
/// editor visual (cabello, rostro, ropa, accesorios y colores).
/// Guardar/Cancelar se resuelven en el cliente; no hay integración con
/// base de datos todavía.
/// </summary>
public class AvatarController : Controller
{
    private readonly IAvatarService _avatarService;

    public AvatarController(IAvatarService avatarService)
    {
        _avatarService = avatarService;
    }

    // GET /Avatar  ·  GET /Avatar/Index/EMP-4821
    public IActionResult Index(string? id)
    {
        var model = _avatarService.GetProfile(id ?? "EMP-0001");
        ViewData["Title"] = $"Mi Avatar · {model.EmployeeName}";
        return View(model);
    }
}