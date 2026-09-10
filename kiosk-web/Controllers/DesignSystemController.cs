using Microsoft.AspNetCore.Mvc;

namespace kiosk_web.Controllers
{
    public class DesignSystemController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
