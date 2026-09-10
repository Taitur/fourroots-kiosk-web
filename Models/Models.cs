namespace FourRootsKiosk.Models;

public class LoginViewModel
{
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public bool RememberMe { get; set; }
    public string? Error { get; set; }
}

public class AppModel
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Desc { get; set; } = "";
    public string Icon { get; set; } = "";
}

public class ModuleModel
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Icon { get; set; } = "";
    public string Gradient { get; set; } = "";
    public List<AppModel> Apps { get; set; } = new();
}

public class NotificationModel
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Desc { get; set; } = "";
    public string Time { get; set; } = "";
    public bool Read { get; set; }
    public string ModuleId { get; set; } = "";
}
