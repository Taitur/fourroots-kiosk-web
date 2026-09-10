using Microsoft.AspNetCore.Mvc;

namespace FourRootsKiosk.Controllers;

public class EngageController : Controller
{
	public IActionResult Index()
	{
		if (string.IsNullOrEmpty(HttpContext.Session.GetString("UserName")))
			return RedirectToAction("Login", "Account");

		ViewData["Title"] = "Engage";
		return View();
	}
}
