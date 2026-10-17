const { sql, getConnection } = require("../db");

// Ficha de asistencia de un colaborador: antigüedad y turno vienen de `empleados`,
// los ascensos de `kio_tbSolIncrementoSueldo` (único movimiento de puesto/sueldo real
// en la BD). No existe todavía una tabla de marcajes/faltas/tardanzas diarios, así que
// esas métricas se calculan en cero hasta que exista esa fuente (p. ej. un Kardex real).

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const METRIC_DEFS = [
  { key: "faltas", label: "Faltas", chartTitle: "Faltas por mes", color: "#C1573F", unit: "", tone: "warn",
    iconSvg: "<circle cx='12' cy='12' r='9'/><path d='M15 9l-6 6M9 9l6 6'/>" },
  { key: "tardanzas", label: "Llegadas tarde", chartTitle: "Llegadas tarde por mes", color: "#C1573F", unit: "", tone: "warn",
    iconSvg: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 3'/>" },
  { key: "tempranas", label: "Llegadas temprano", chartTitle: "Llegadas temprano por mes", color: "#2F6F68", unit: "", tone: "good",
    iconSvg: "<path d='M12 3v6M5 12l7-7 7 7M5 21h14'/>" },
  { key: "horasExtra", label: "Horas extra", chartTitle: "Horas extra por mes", color: "#C89B4A", unit: "h", tone: "brass",
    iconSvg: "<circle cx='12' cy='12' r='9'/><path d='M12 6v6l4 2'/>" },
  { key: "ascensos", label: "Ascensos", chartTitle: "Ascensos por mes", color: "#11151A", unit: "", tone: "neutral",
    iconSvg: "<path d='M4 21V10l8-6 8 6v11M9 21v-6h6v6'/>" },
];

const sum = (values) => values.reduce((a, b) => a + b, 0);

function withTotals(metric) {
  const total = sum(metric.values);
  return { ...metric, total, average: metric.values.length === 0 ? 0 : total / metric.values.length };
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function getEmployeeInfo(employeeId) {
  if (!employeeId) return null;
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id", sql.Int, employeeId)
    .query(`SELECT antiguedad_anios, antiguedad_meses, turno FROM empleados WHERE id = @id`);
  return result.recordset[0] || null;
}

// Ascensos/cambios de puesto reales: cada fila de kio_tbSolIncrementoSueldo registra
// el puesto y departamento anteriores y nuevos de un movimiento de nómina.
async function getPromotions(employeeId) {
  if (!employeeId) return [];
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id", sql.Int, employeeId)
    .query(`
      SELECT s.dtFechaPropuesta AS fecha, s.vcMotivoModificacion AS motivo,
             dNew.vcNombre AS depNuevo, dAnt.vcNombre AS depAnterior,
             pNew.CODIGO AS puestoNuevo, pAnt.CODIGO AS puestoAnterior
      FROM kio_tbSolIncrementoSueldo s
      LEFT JOIN kio_tbDepartamentos dNew ON dNew.iIdDepartamento = s.iIdDepartamento
      LEFT JOIN kio_tbDepartamentos dAnt ON dAnt.iIdDepartamento = s.iIdDepartamentoAnt
      LEFT JOIN KIO_OC_DESC_PUESTOS pNew ON pNew.ID_PUESTO = s.iIdPuesto
      LEFT JOIN KIO_OC_DESC_PUESTOS pAnt ON pAnt.ID_PUESTO = s.iIdPuestoAnt
      WHERE s.iIdEmpleado = @id
      ORDER BY s.dtFechaPropuesta DESC`);

  const now = new Date();
  return result.recordset.map((row) => {
    const rawDate = row.fecha ? new Date(row.fecha) : null;
    const changedPuesto = row.puestoNuevo && row.puestoNuevo !== row.puestoAnterior;
    const descParts = [];
    if (row.depNuevo && row.depNuevo !== row.depAnterior) descParts.push(`Cambio a ${row.depNuevo}`);
    if (row.motivo) descParts.push(row.motivo);

    return {
      rawDate,
      date: rawDate ? rawDate.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "",
      title: changedPuesto ? `Ascenso a ${row.puestoNuevo}` : "Incremento de sueldo",
      description: descParts.join(". ") || "Movimiento registrado en nómina.",
      upcoming: Boolean(rawDate && rawDate > now),
    };
  });
}

async function getEmployeeSheet(user) {
  const now = new Date();
  const months = MONTH_LABELS.slice(0, now.getMonth() + 1);

  const promotions = await getPromotions(user.employeeId);

  const ascensosPorMes = new Array(months.length).fill(0);
  promotions.forEach((p) => {
    if (p.upcoming || !p.rawDate || p.rawDate.getFullYear() !== now.getFullYear()) return;
    ascensosPorMes[p.rawDate.getMonth()]++;
  });

  const metrics = METRIC_DEFS.map((def) =>
    withTotals({ ...def, values: def.key === "ascensos" ? ascensosPorMes : new Array(months.length).fill(0) })
  );

  const info = await getEmployeeInfo(user.employeeId);
  const seniority = info && (info.antiguedad_anios || info.antiguedad_meses)
    ? `${info.antiguedad_anios || 0} años, ${info.antiguedad_meses || 0} meses`
    : "No disponible";

  const totalOf = (key) => metrics.find((m) => m.key === key).total;
  const monthLong = capitalize(now.toLocaleDateString("es-MX", { month: "long" }));
  const monthShort = capitalize(now.toLocaleDateString("es-MX", { month: "short" }));

  return {
    employee: {
      name: user.name,
      initials: user.initials,
      role: user.role,
      employeeId: user.employeeId ? `EMP-${user.employeeId}` : "—",
      seniority,
      shift: info && info.turno != null ? `Turno ${info.turno}` : "No disponible",
    },
    periodStatus: "Periodo activo",
    periodRange: `Ene — ${monthShort} ${now.getFullYear()}`,
    periodRangeLong: `Enero — ${monthLong} ${now.getFullYear()}`,
    totalFaltas: totalOf("faltas"),
    totalTardanzas: totalOf("tardanzas"),
    totalTempranas: totalOf("tempranas"),
    totalHorasExtra: totalOf("horasExtra"),
    totalAscensos: promotions.filter((p) => !p.upcoming).length,
    months,
    metrics,
    promotions: promotions.map(({ rawDate, ...rest }) => rest),
  };
}

module.exports = { getEmployeeSheet };
