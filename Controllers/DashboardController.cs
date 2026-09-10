using FourRootsKiosk.Services;
using Microsoft.AspNetCore.Mvc;

namespace FourRootsKiosk.Controllers;

public class DashboardController : Controller
{
    private readonly MockDataService _data;
    public DashboardController(MockDataService data) => _data = data;

    public IActionResult Index()
    {
        if (string.IsNullOrEmpty(HttpContext.Session.GetString("UserName")))
            return RedirectToAction("Login", "Account");

        ViewBag.UserName = HttpContext.Session.GetString("UserName");
        ViewBag.UserRole = HttpContext.Session.GetString("UserRole");
        ViewBag.UserInitials = HttpContext.Session.GetString("UserInitials");

        return View(_data.Modules);
    }
}
