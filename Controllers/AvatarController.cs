using FourRootsKiosk.Services;
using Microsoft.AspNetCore.Mvc;

namespace FourRootsKiosk.Controllers;

// Página "Mi Avatar": muestra el avatar guardado del colaborador y el editor visual.
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
        if (string.IsNullOrEmpty(HttpContext.Session.GetString("UserName")))
            return RedirectToAction("Login", "Account");

        var model = _avatarService.GetProfile(id ?? "EMP-0001");
        ViewData["Title"] = $"Mi Avatar · {model.EmployeeName}";
        return View(model);
    }
}
