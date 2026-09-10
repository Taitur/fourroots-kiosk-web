using kiosk_web.Models;

namespace kiosk_web.Services;

/// <summary>
/// Implementación con datos de ejemplo del avatar de un colaborador.
/// Cuando exista el backend real de Capital Humano, esta clase se sustituye
/// por una que consulte la API sin tocar el controlador ni la vista.
/// </summary>
public class AvatarService : IAvatarService
{
    public AvatarViewModel GetProfile(string employeeId)
    {
        var model = BuildSampleProfile();
        return model;
    }

    private static AvatarViewModel BuildSampleProfile()
    {
        return new AvatarViewModel
        {
            EmployeeName = "María González",
            EmployeeRole = "Coordinadora · Capital Humano",
            StatusLabel = "Activo",
            LastEditedText = "Última edición: hace 3 días",
            CurrentAvatar = new AvatarConfig
            {
                SkinTone = "#F1C27D",
                HairStyle = "short",
                HairColor = "#2C2416",
                FaceStyle = "happy",
                ClothingStyle = "tshirt",
                ClothingColor = "#6C5CE7",
                AccessoryStyle = "none",
            },
            ContextItems = new List<AvatarContextItem>
            {
                new()
                {
                    Title = "Mi perfil",
                    Description = "Encabezado de perfil público y tarjeta de contacto.",
                    IconSvg = "<circle cx='12' cy='8' r='4'/><path d='M4 20c1.6-4.2 4.8-6 8-6s6.4 1.8 8 6'/>",
                },
                new()
                {
                    Title = "Comunidad",
                    Description = "Publicaciones, foros, comentarios y reacciones.",
                    IconSvg = "<path d='M21 15a4 4 0 0 1-4 4H8l-5 3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z'/>",
                },
            },
            HairStyles = new List<AvatarOption>
            {
                new() { Key = "none", Label = "Ninguno", IconSvg = "<path d='M4 4l16 16M20 4 4 20'/>" },
                new() { Key = "short", Label = "Corto", IconSvg = "<path d='M4 10a8 8 0 0 1 16 0'/>" },
                new() { Key = "long", Label = "Largo", IconSvg = "<path d='M4 10a8 8 0 0 1 16 0v8M4 10v8'/>" },
                new() { Key = "curly", Label = "Rizado", IconSvg = "<circle cx='7' cy='9' r='2'/><circle cx='12' cy='7' r='2'/><circle cx='17' cy='9' r='2'/>" },
                new() { Key = "buzz", Label = "Rapado", IconSvg = "<path d='M4 11a8 8 0 0 1 16 0' stroke-dasharray='2 2'/>" },
                new() { Key = "ponytail", Label = "Coleta", IconSvg = "<path d='M4 10a8 8 0 0 1 16 0'/><path d='M20 10c2 1 2 5 0 7'/>" },
            },
            FaceStyles = new List<AvatarOption>
            {
                new() { Key = "neutral", Label = "Neutral", IconSvg = "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><path d='M9 15h6'/>" },
                new() { Key = "happy", Label = "Sonriente", IconSvg = "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><path d='M8 14c1.2 1.4 6.8 1.4 8 0'/>" },
                new() { Key = "serious", Label = "Serio", IconSvg = "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><path d='M9 15h6' /><path d='M8 8h2M14 8h2'/>" },
                new() { Key = "surprised", Label = "Sorprendido", IconSvg = "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><circle cx='12' cy='15' r='1.6'/>" },
            },
            ClothingStyles = new List<AvatarOption>
            {
                new() { Key = "tshirt", Label = "Playera", IconSvg = "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/>" },
                new() { Key = "shirt", Label = "Camisa", IconSvg = "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/><path d='M10 4l2 4 2-4'/>" },
                new() { Key = "blazer", Label = "Blazer", IconSvg = "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/><path d='M10 6 8 20M14 6l2 14'/>" },
                new() { Key = "hoodie", Label = "Sudadera", IconSvg = "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/><path d='M9 6c1.5 2 4.5 2 6 0'/>" },
            },
            AccessoryStyles = new List<AvatarOption>
            {
                new() { Key = "none", Label = "Ninguno", IconSvg = "<path d='M4 4l16 16M20 4 4 20'/>" },
                new() { Key = "glasses", Label = "Lentes", IconSvg = "<circle cx='8' cy='12' r='3'/><circle cx='16' cy='12' r='3'/><path d='M11 12h2M5 12H3M21 12h-2'/>" },
                new() { Key = "cap", Label = "Gorra", IconSvg = "<path d='M4 13a8 8 0 0 1 16 0'/><path d='M4 13h18v2H4z'/>" },
                new() { Key = "earrings", Label = "Aretes", IconSvg = "<circle cx='7' cy='14' r='1.4'/><circle cx='17' cy='14' r='1.4'/><path d='M9 9a3 3 0 0 1 6 0'/>" },
            },
            SkinTones = new List<string> { "#FFDBAC", "#F1C27D", "#E0AC69", "#C68642", "#8D5524", "#5C3A21" },
            HairColors = new List<string> { "#1B1B1B", "#2C2416", "#5B3A29", "#8B5E3C", "#C99A5B", "#8A8A8A" },
            ClothingColors = new List<string> { "#6C5CE7", "#2F7BF0", "#1FA97A", "#FF6B6B", "#C89B4A", "#12142B" },
        };
    }
}