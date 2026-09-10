using Microsoft.AspNetCore.Mvc;

namespace kiosk_web.Controllers;

public class EngageController : Controller
{
	public IActionResult Index()
	{
		ViewData["Title"] = "Engage";
		return View();
	}
}
