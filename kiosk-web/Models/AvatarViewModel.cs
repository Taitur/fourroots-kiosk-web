namespace kiosk_web.Models;

/// <summary>
/// Modelo de la página "Mi Avatar".
/// Contiene los datos del usuario, la configuración del avatar
/// y las opciones disponibles para editarlo.
/// </summary>
public class AvatarViewModel
{
    public string EmployeeName { get; set; } = "";
    public string EmployeeRole { get; set; } = "";

    public string StatusLabel { get; set; } = "Activo";

    public string LastEditedText { get; set; } = "";

    public AvatarConfig CurrentAvatar { get; set; } = new();

    public List<AvatarContextItem> ContextItems { get; set; } = new();

    public List<AvatarOption> HairStyles { get; set; } = new();
    public List<AvatarOption> FaceStyles { get; set; } = new();
    public List<AvatarOption> ClothingStyles { get; set; } = new();
    public List<AvatarOption> AccessoryStyles { get; set; } = new();

    public List<string> SkinTones { get; set; } = new();
    public List<string> HairColors { get; set; } = new();
    public List<string> ClothingColors { get; set; } = new();
}

public class AvatarConfig
{
    public string SkinTone { get; set; } = "#F1C27D";
    public string HairStyle { get; set; } = "short";
    public string HairColor { get; set; } = "#2C2416";
    public string FaceStyle { get; set; } = "neutral";
    public string ClothingStyle { get; set; } = "tshirt";
    public string ClothingColor { get; set; } = "#6C5CE7";
    public string AccessoryStyle { get; set; } = "none";
}

public class AvatarOption
{
    public string Key { get; set; } = "";
    public string Label { get; set; } = "";
    public string IconSvg { get; set; } = "";
}

public class AvatarContextItem
{
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string IconSvg { get; set; } = "";
}