using FourRootsKiosk.Services;
using Microsoft.AspNetCore.Mvc;

namespace FourRootsKiosk.Controllers;

// Ficha de asistencia de Recursos Humanos: faltas, puntualidad, horas extra y ascensos.
public class AttendanceController : Controller
{
    private readonly IAttendanceService _attendanceService;

    public AttendanceController(IAttendanceService attendanceService)
    {
        _attendanceService = attendanceService;
    }

    // GET /Attendance  ·  GET /Attendance/Index/EMP-4821
    public IActionResult Index(string? id)
    {
        if (string.IsNullOrEmpty(HttpContext.Session.GetString("UserName")))
            return RedirectToAction("Login", "Account");

        var model = _attendanceService.GetEmployeeSheet(id ?? "EMP-4821");
        ViewData["Title"] = $"Ficha de Asistencia · {model.Employee.Name}";
        return View(model);
    }
}
