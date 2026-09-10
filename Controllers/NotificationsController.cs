using FourRootsKiosk.Services;
using Microsoft.AspNetCore.Mvc;

namespace FourRootsKiosk.Controllers;

[Route("api/notifications")]
public class NotificationsController : Controller
{
    private readonly MockDataService _data;
    public NotificationsController(MockDataService data) => _data = data;

    [HttpGet]
    public IActionResult Get() => Json(_data.Notifications);

    [HttpPatch("{id}/read")]
    public IActionResult MarkRead(string id)
    {
        var n = _data.Notifications.FirstOrDefault(x => x.Id == id);
        if (n == null) return NotFound();
        n.Read = true;
        return Ok();
    }

    [HttpPatch("read-all")]
    public IActionResult MarkAllRead()
    {
        foreach (var n in _data.Notifications) n.Read = true;
        return Ok();
    }
}
