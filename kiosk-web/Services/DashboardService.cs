using kiosk_web.Models;

namespace kiosk_web.Services;

/// <summary>
/// Implementación con datos de ejemplo de la ficha de asistencia.
/// Cuando exista el backend real de Nómina, esta clase se sustituye por una
/// que consulte la API sin tocar el controlador ni la vista.
/// </summary>
public class DashboardService : IDashboardService
{
    private static readonly string[] PeriodMonths = { "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago" };

    public DashboardViewModel GetEmployeeSheet(string employeeId)
    {
        // Catálogo de ejemplo. Hoy sólo hay un colaborador; se busca por id y,
        // si no coincide, se devuelve de todos modos para no romper la demo.
        var model = BuildSampleSheet();

        model.Employee.EmployeeId = string.IsNullOrWhiteSpace(employeeId)
            ? model.Employee.EmployeeId
            : employeeId;

        return model;
    }

    private static DashboardViewModel BuildSampleSheet()
    {
        var metrics = new List<AttendanceMetric>
        {
            new()
            {
                Key = "faltas",
                Label = "Faltas",
                ChartTitle = "Faltas por mes",
                Color = "#C1573F",
                Tone = "warn",
                IconSvg = "<circle cx='12' cy='12' r='9'/><path d='M15 9l-6 6M9 9l6 6'/>",
                Values = new List<int> { 2, 1, 0, 1, 0, 0, 1, 0 },
            },
            new()
            {
                Key = "tardanzas",
                Label = "Llegadas tarde",
                ChartTitle = "Llegadas tarde por mes",
                Color = "#C1573F",
                Tone = "warn",
                IconSvg = "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 3'/>",
                Values = new List<int> { 4, 3, 5, 2, 3, 1, 2, 1 },
            },
            new()
            {
                Key = "tempranas",
                Label = "Llegadas temprano",
                ChartTitle = "Llegadas temprano por mes",
                Color = "#2F6F68",
                Tone = "good",
                IconSvg = "<path d='M12 3v6M5 12l7-7 7 7M5 21h14'/>",
                Values = new List<int> { 1, 2, 1, 3, 2, 4, 3, 5 },
            },
            new()
            {
                Key = "horasExtra",
                Label = "Horas extra",
                ChartTitle = "Horas extra por mes",
                Color = "#C89B4A",
                Unit = "h",
                Tone = "brass",
                IconSvg = "<circle cx='12' cy='12' r='9'/><path d='M12 6v6l4 2'/>",
                Values = new List<int> { 6, 8, 4, 10, 12, 9, 14, 11 },
            },
            new()
            {
                Key = "ascensos",
                Label = "Ascensos",
                ChartTitle = "Ascensos por mes",
                Color = "#11151A",
                Tone = "neutral",
                IconSvg = "<path d='M4 21V10l8-6 8 6v11M9 21v-6h6v6'/>",
                Values = new List<int> { 0, 0, 0, 0, 0, 0, 0, 0 },
            },
        };

        var promotions = new List<PromotionEntry>
        {
            new()
            {
                Date = "15 mar 2023",
                Title = "Ingreso como Auxiliar de Producción",
                Description = "Contratación inicial en Línea 3, turno matutino.",
            },
            new()
            {
                Date = "02 sep 2024",
                Title = "Ascenso a Operador Especializado",
                Description = "Reconocimiento por cumplimiento de metas de calidad y cero incidentes en 6 meses.",
            },
            new()
            {
                Date = "02 sep 2025",
                Title = "Ascenso a Técnico de Producción",
                Description = "Ampliación de responsabilidades: mantenimiento preventivo y capacitación de nuevo personal.",
            },
            new()
            {
                Date = "Próxima evaluación: 02 sep 2026",
                Title = "Candidato a Técnico Senior",
                Description = "En seguimiento por parte del área de Recursos Humanos.",
                Upcoming = true,
            },
        };

        var faltas = metrics.First(m => m.Key == "faltas");
        var tardanzas = metrics.First(m => m.Key == "tardanzas");
        var tempranas = metrics.First(m => m.Key == "tempranas");
        var horasExtra = metrics.First(m => m.Key == "horasExtra");

        return new DashboardViewModel
        {
            Employee = new EmployeeInfo
            {
                Name = "Diego Ramírez",
                Initials = "DR",
                Role = "Técnico de Producción · Línea 3",
                EmployeeId = "EMP-4821",
                Seniority = "3 años, 4 meses",
                Shift = "Matutino",
            },
            PeriodStatus = "Periodo activo",
            PeriodRange = "Ene — Ago 2026",
            PeriodRangeLong = "Enero — agosto 2026",
            TotalFaltas = faltas.Total,
            TotalTardanzas = tardanzas.Total,
            TotalTempranas = tempranas.Total,
            TotalHorasExtra = horasExtra.Total,
            TotalAscensos = promotions.Count(p => !p.Upcoming && p.Title.StartsWith("Ascenso", StringComparison.OrdinalIgnoreCase)),
            Months = PeriodMonths.ToList(),
            Metrics = metrics,
            Promotions = promotions,
        };
    }
}
