using FourRootsKiosk.Models;
using Microsoft.AspNetCore.Mvc;

namespace FourRootsKiosk.Controllers;

public class AccountController : Controller
{
    [HttpGet]
    public IActionResult Login() => View(new LoginViewModel());

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Login(LoginViewModel model)
    {
        if (string.IsNullOrWhiteSpace(model.Username) || string.IsNullOrWhiteSpace(model.Password))
        {
            model.Error = "Usuario y contraseña requeridos";
            return View(model);
        }

        // MVP: cualquier credencial no vacía se acepta (mock).
        HttpContext.Session.SetString("UserName", "Ana Torres");
        HttpContext.Session.SetString("UserRole", "Administradora de RRHH");
        HttpContext.Session.SetString("UserInitials", "AT");

        return RedirectToAction("Index", "Dashboard");
    }

    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return RedirectToAction("Login");
    }
}
