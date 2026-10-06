// Ficha de asistencia de un colaborador (faltas, puntualidad, horas extra y ascensos).
// Implementación con datos de ejemplo. Cuando exista el backend real de Nómina,
// este modelo se sustituye por uno que consulte la API sin tocar el controlador ni la vista.

const PERIOD_MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago"];

const sum = (values) => values.reduce((a, b) => a + b, 0);

// Añade total y promedio calculados a cada métrica.
function withTotals(metric) {
  const total = sum(metric.values);
  return {
    ...metric,
    total,
    average: metric.values.length === 0 ? 0 : total / metric.values.length,
  };
}

function buildSampleSheet() {
  const metrics = [
    {
      key: "faltas",
      label: "Faltas",
      chartTitle: "Faltas por mes",
      color: "#C1573F",
      unit: "",
      tone: "warn",
      iconSvg: "<circle cx='12' cy='12' r='9'/><path d='M15 9l-6 6M9 9l6 6'/>",
      values: [2, 1, 0, 1, 0, 0, 1, 0],
    },
    {
      key: "tardanzas",
      label: "Llegadas tarde",
      chartTitle: "Llegadas tarde por mes",
      color: "#C1573F",
      unit: "",
      tone: "warn",
      iconSvg: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 3'/>",
      values: [4, 3, 5, 2, 3, 1, 2, 1],
    },
    {
      key: "tempranas",
      label: "Llegadas temprano",
      chartTitle: "Llegadas temprano por mes",
      color: "#2F6F68",
      unit: "",
      tone: "good",
      iconSvg: "<path d='M12 3v6M5 12l7-7 7 7M5 21h14'/>",
      values: [1, 2, 1, 3, 2, 4, 3, 5],
    },
    {
      key: "horasExtra",
      label: "Horas extra",
      chartTitle: "Horas extra por mes",
      color: "#C89B4A",
      unit: "h",
      tone: "brass",
      iconSvg: "<circle cx='12' cy='12' r='9'/><path d='M12 6v6l4 2'/>",
      values: [6, 8, 4, 10, 12, 9, 14, 11],
    },
    {
      key: "ascensos",
      label: "Ascensos",
      chartTitle: "Ascensos por mes",
      color: "#11151A",
      unit: "",
      tone: "neutral",
      iconSvg: "<path d='M4 21V10l8-6 8 6v11M9 21v-6h6v6'/>",
      values: [0, 0, 0, 0, 0, 0, 0, 0],
    },
  ].map(withTotals);

  const promotions = [
    {
      date: "15 mar 2023",
      title: "Ingreso como Auxiliar de Producción",
      description: "Contratación inicial en Línea 3, turno matutino.",
      upcoming: false,
    },
    {
      date: "02 sep 2024",
      title: "Ascenso a Operador Especializado",
      description: "Reconocimiento por cumplimiento de metas de calidad y cero incidentes en 6 meses.",
      upcoming: false,
    },
    {
      date: "02 sep 2025",
      title: "Ascenso a Técnico de Producción",
      description: "Ampliación de responsabilidades: mantenimiento preventivo y capacitación de nuevo personal.",
      upcoming: false,
    },
    {
      date: "Próxima evaluación: 02 sep 2026",
      title: "Candidato a Técnico Senior",
      description: "En seguimiento por parte del área de Recursos Humanos.",
      upcoming: true,
    },
  ];

  const totalOf = (key) => metrics.find((m) => m.key === key).total;

  return {
    employee: {
      name: "Diego Ramírez",
      initials: "DR",
      role: "Técnico de Producción · Línea 3",
      employeeId: "EMP-4821",
      seniority: "3 años, 4 meses",
      shift: "Matutino",
    },
    periodStatus: "Periodo activo",
    periodRange: "Ene — Ago 2026",
    periodRangeLong: "Enero — agosto 2026",
    totalFaltas: totalOf("faltas"),
    totalTardanzas: totalOf("tardanzas"),
    totalTempranas: totalOf("tempranas"),
    totalHorasExtra: totalOf("horasExtra"),
    totalAscensos: promotions.filter((p) => !p.upcoming && p.title.toLowerCase().startsWith("ascenso")).length,
    months: [...PERIOD_MONTHS],
    metrics,
    promotions,
  };
}

// Devuelve la ficha del colaborador indicado. Hoy sólo hay un colaborador de ejemplo;
// si el id no coincide se devuelve de todos modos para no romper la demo.
function getEmployeeSheet(employeeId) {
  const model = buildSampleSheet();
  if (employeeId && employeeId.trim()) model.employee.employeeId = employeeId;
  return model;
}

module.exports = { getEmployeeSheet };
