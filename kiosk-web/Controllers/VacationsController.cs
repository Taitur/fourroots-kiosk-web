using Microsoft.AspNetCore.Mvc;

namespace kiosk_web.Controllers
{
    public class VacationsController : Controller
    {
        public IActionResult Vacaciones()
        {
            return View();
        }
    }
}