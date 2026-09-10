using Microsoft.AspNetCore.Mvc;
using kiosk_web.Services;

namespace kiosk_web.Controllers;

/// <summary>
/// Ficha de asistencia de Recursos Humanos: faltas, puntualidad, horas extra y ascensos.
/// </summary>
public class DashboardController : Controller
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    // GET /Dashboard  ·  GET /Dashboard/Index/EMP-4821
    public IActionResult Index(string? id)
    {
        var model = _dashboardService.GetEmployeeSheet(id ?? "EMP-4821");
        ViewData["Title"] = $"Ficha de Asistencia · {model.Employee.Name}";
        return View(model);
    }
}
