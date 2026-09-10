namespace FourRootsKiosk.Models;

/// <summary>
/// Modelo de la "Ficha de asistencia" de un colaborador.
/// Alimenta la vista Dashboard/Index (faltas, puntualidad, horas extra y ascensos).
/// </summary>
public class AttendanceViewModel
{
    /// <summary>Datos de identificación del colaborador consultado.</summary>
    public EmployeeInfo Employee { get; set; } = new();

    /// <summary>Etiqueta del estado del periodo, p. ej. "Periodo activo".</summary>
    public string PeriodStatus { get; set; } = "Periodo activo";

    /// <summary>Rango del periodo mostrado, p. ej. "Ene — Ago 2026".</summary>
    public string PeriodRange { get; set; } = "";

    /// <summary>Rango del periodo en texto largo, usado como subtítulo de la gráfica.</summary>
    public string PeriodRangeLong { get; set; } = "";

    // ---- cifras rápidas (fila de stats) ----
    public int TotalFaltas { get; set; }
    public int TotalTardanzas { get; set; }
    public int TotalTempranas { get; set; }
    public int TotalHorasExtra { get; set; }
    public int TotalAscensos { get; set; }

    /// <summary>Etiquetas de los meses del periodo (Ene, Feb, ...).</summary>
    public List<string> Months { get; set; } = new();

    /// <summary>Métricas mensuales de asistencia; una por tarjeta seleccionable.</summary>
    public List<AttendanceMetric> Metrics { get; set; } = new();

    /// <summary>Línea de tiempo de ascensos / trayectoria dentro de la empresa.</summary>
    public List<PromotionEntry> Promotions { get; set; } = new();
}

/// <summary>Ficha básica del colaborador mostrada en la "tarjeta de reloj checador".</summary>
public class EmployeeInfo
{
    public string Name { get; set; } = "";
    public string Initials { get; set; } = "";
    public string Role { get; set; } = "";
    public string EmployeeId { get; set; } = "";
    public string Seniority { get; set; } = "";
    public string Shift { get; set; } = "";
}

/// <summary>Serie mensual de una métrica de asistencia (faltas, tardanzas, etc.).</summary>
public class AttendanceMetric
{
    /// <summary>Clave estable usada por el JS del selector (faltas, tardanzas, ...).</summary>
    public string Key { get; set; } = "";

    /// <summary>Texto corto de la tarjeta.</summary>
    public string Label { get; set; } = "";

    /// <summary>Título del panel de la gráfica cuando esta métrica está activa.</summary>
    public string ChartTitle { get; set; } = "";

    /// <summary>Color de las barras (hex).</summary>
    public string Color { get; set; } = "#11151A";

    /// <summary>Sufijo de unidad para los totales, p. ej. "h". Cadena vacía si no aplica.</summary>
    public string Unit { get; set; } = "";

    /// <summary>Tono de la cifra en la fila de stats: warn | good | brass | neutral.</summary>
    public string Tone { get; set; } = "neutral";

    /// <summary>Contenido interno del &lt;svg&gt; del icono (paths / circles).</summary>
    public string IconSvg { get; set; } = "";

    /// <summary>Valores mensuales, alineados con <see cref="AttendanceViewModel.Months"/>.</summary>
    public List<int> Values { get; set; } = new();

    public int Total => Values.Sum();

    public double Average => Values.Count == 0 ? 0 : (double)Values.Sum() / Values.Count;
}

/// <summary>Un hito en la trayectoria del colaborador (contratación o ascenso).</summary>
public class PromotionEntry
{
    public string Date { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";

    /// <summary>true si es un hito futuro / en seguimiento (se muestra atenuado).</summary>
    public bool Upcoming { get; set; }
}
