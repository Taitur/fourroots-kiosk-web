const { sql, getConnection } = require("../db");

// Ficha de asistencia de un colaborador: antigüedad y turno vienen de `empleados`,
// los ascensos de `kio_tbSolIncrementoSueldo` y faltas, retardos y llegadas temprano de la
// tabla `Asistencias` (un registro por día y empleado, con Tipo Falta, Retardo, Temprano o
// Puntual). `Asistencias` no tiene columna de horas: las horas extra que da el administrador se
// guardan en su columna Observaciones con la marca [HE:2.5] (ver OVERTIME_RE) y de ahí se suman.

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
             CONVERT(varchar(23), s.dtFechaPropuesta, 126) AS clave,
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
      key: row.clave,
      reason: row.motivo || "",
      isoDate: rawDate ? rawDate.toISOString().slice(0, 10) : "",
      rawDate,
      date: rawDate ? rawDate.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "",
      title: changedPuesto ? `Ascenso a ${row.puestoNuevo}` : "Incremento de sueldo",
      description: descParts.join(". ") || "Movimiento registrado en nómina.",
      upcoming: Boolean(rawDate && rawDate > now),
    };
  });
}

// Horas extra dentro de Observaciones: "[HE:2.5]" al final del texto (máx. 200 caracteres en total).
const OVERTIME_RE = /\s*\[HE:(\d+(?:\.\d+)?)\]/g;
const MAX_HORAS_EXTRA = 12;

function overtimeOf(observations) {
  const match = /\[HE:(\d+(?:\.\d+)?)\]/.exec(String(observations || ""));
  return match ? Number(match[1]) : 0;
}

// Devuelve el texto de Observaciones con las horas extra indicadas (0 las quita).
function withOvertime(observations, hours) {
  const base = String(observations || "").replace(OVERTIME_RE, "").trim();
  if (!hours) return base;
  const mark = `[HE:${hours}]`;
  return (base.slice(0, 200 - mark.length - 1) + " " + mark).trim();
}

// Columna Tipo de Asistencias -> clave de métrica de la ficha.
const TIPO_A_METRICA = { falta: "faltas", retardo: "tardanzas", temprano: "tempranas" };

// Conteo mensual de faltas, retardos y llegadas temprano del año indicado (enero hasta `monthCount`).
// Devuelve { faltas: [..], tardanzas: [..], tempranas: [..] } con un valor por mes.
async function getAttendanceByMonth(user, year, monthCount) {
  const counts = { faltas: [], tardanzas: [], tempranas: [], horasExtra: [] };
  Object.keys(counts).forEach((k) => { counts[k] = new Array(monthCount).fill(0); });
  if (!user.employeeId) return counts;

  const pool = await getConnection();
  const result = await pool
    .request()
    .input("compania", sql.Int, user.companyId || null)
    .input("empleado", sql.Int, user.employeeId)
    .input("anio", sql.Int, year)
    .query(`
      SELECT MONTH(Fecha) AS mes, Tipo AS tipo, COUNT(*) AS total
      FROM Asistencias
      WHERE IdEmpleado = @empleado
        AND (@compania IS NULL OR Compania = @compania)
        AND Fecha >= DATEFROMPARTS(@anio, 1, 1) AND Fecha < DATEFROMPARTS(@anio + 1, 1, 1)
      GROUP BY MONTH(Fecha), Tipo`);

  result.recordset.forEach((row) => {
    const key = TIPO_A_METRICA[String(row.tipo || "").trim().toLowerCase()];
    const index = Number(row.mes) - 1;
    if (key && index >= 0 && index < monthCount) counts[key][index] += Number(row.total) || 0;
  });

  // Horas extra: marca [HE:n] en Observaciones de los registros del año.
  const overtime = await pool
    .request()
    .input("compania", sql.Int, user.companyId || null)
    .input("empleado", sql.Int, user.employeeId)
    .input("anio", sql.Int, year)
    .query(`
      SELECT MONTH(Fecha) AS mes, Observaciones AS observaciones
      FROM Asistencias
      WHERE IdEmpleado = @empleado
        AND (@compania IS NULL OR Compania = @compania)
        AND Fecha >= DATEFROMPARTS(@anio, 1, 1) AND Fecha < DATEFROMPARTS(@anio + 1, 1, 1)
        AND Observaciones LIKE '%[[]HE:%'`);
  overtime.recordset.forEach((row) => {
    const index = Number(row.mes) - 1;
    if (index >= 0 && index < monthCount) counts.horasExtra[index] += overtimeOf(row.observaciones);
  });
  return counts;
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

  const attendance = await getAttendanceByMonth(user, now.getFullYear(), months.length);

  const metrics = METRIC_DEFS.map((def) =>
    withTotals({
      ...def,
      values: def.key === "ascensos" ? ascensosPorMes : attendance[def.key] || new Array(months.length).fill(0),
    })
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

// ---------------------------------------------------------------------------------------------
// Administrador: ver y editar la ficha de cualquier colaborador.
// ---------------------------------------------------------------------------------------------

// Valores que guarda la columna Tipo de Asistencias.
const TIPOS_ASISTENCIA = ["Falta", "Retardo", "Temprano", "Puntual"];
const MAX_MOTIVO = 200;
// Observaciones de los registros que crea el administrador (columna Observaciones, varchar(200)).
const OBSERVACION_ADMIN = "Registrado por el administrador";

function initialsOf(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

// Datos de un usuario del kiosco (mismo formato que req.session.user) a partir de su id en
// kio_tbUsuarios. employeeId (columna iId) es el empleado vinculado; 0 si no tiene.
async function getUserIdentity(userId) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .query(`
      SELECT TOP 1 u.iIdUsuario, u.iIdCompania, u.iId, u.vcUsuario, r.nombre, r.paterno, r.materno,
             CASE WHEN p.valor = CAST(u.iIdUsuario AS varchar(60)) THEN 1 ELSE 0 END AS esAdmin
      FROM kio_tbUsuarios u
      LEFT JOIN recursos r ON r.id = u.iId
      OUTER APPLY (
        SELECT TOP 1 valor FROM parametros
        WHERE grupo = 'KIOSKO' AND variable = 'USUARIO_ADMINISTRADOR'
      ) p
      WHERE u.iIdUsuario = @usuario AND u.bBorrado = 0`);

  const row = result.recordset[0];
  if (!row) return null;
  const fullName = [row.nombre, row.paterno, row.materno].filter(Boolean).map((t) => t.trim()).join(" ");
  const name = fullName || row.vcUsuario;
  return {
    id: row.iIdUsuario,
    companyId: row.iIdCompania,
    employeeId: row.iId || 0,
    name,
    initials: initialsOf(name),
    role: row.esAdmin ? "Administrador" : "Colaborador",
  };
}

// Registros de la tabla Asistencias en un mes (month = "YYYY-MM"): un renglón por día que tenga registro.
async function listRecords(identity, month) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("compania", sql.Int, identity.companyId || null)
    .input("empleado", sql.Int, identity.employeeId)
    .input("inicio", sql.VarChar(10), month + "-01")
    .query(`
      SELECT CONVERT(varchar(10), CAST(Fecha AS date), 23) AS fecha, Tipo AS tipo, Observaciones AS observaciones
      FROM Asistencias
      WHERE IdEmpleado = @empleado
        AND (@compania IS NULL OR Compania = @compania)
        AND CAST(Fecha AS date) >= CAST(@inicio AS date)
        AND CAST(Fecha AS date) < DATEADD(month, 1, CAST(@inicio AS date))
      ORDER BY Fecha`);
  return result.recordset.map((r) => ({
    date: r.fecha,
    type: String(r.tipo || "").trim(),
    overtime: overtimeOf(r.observaciones),
  }));
}

// Guarda el día en la tabla Asistencias: cambia el tipo y/o las horas extra del registro que ya existe,
// o crea el registro si ese día no tenía (con Tipo "Puntual" si solo se dan horas extra).
// Es la misma tabla de la que lee la ficha del colaborador, así que el cambio se ve en su ficha.
// Columnas: IdAsistencia (PK), Compania, IdEmpleado, Fecha, HoraEntrada, Tipo, Observaciones.
// Si IdAsistencia es IDENTITY lo genera la base; si no, se toma el siguiente id bajo bloqueo
// (igual que en las demás tablas heredadas, ver userModel.createUser). Un registro nuevo lleva
// HoraEntrada vacía (o 00:00 si la columna no admite NULL) y una observación que lo marca como del admin.
// type: Falta/Retardo/Temprano/Puntual o undefined para no cambiarlo; overtime: horas o undefined.
async function setRecord(identity, date, { type, overtime }) {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const existing = await new sql.Request(tx)
      .input("compania", sql.Int, identity.companyId || null)
      .input("empleado", sql.Int, identity.employeeId)
      .input("fecha", sql.VarChar(10), date)
      .query(`
        SELECT IdAsistencia AS id, Tipo AS tipo, Observaciones AS observaciones
        FROM Asistencias WITH (UPDLOCK, HOLDLOCK)
        WHERE IdEmpleado = @empleado
          AND (@compania IS NULL OR Compania = @compania)
          AND CAST(Fecha AS date) = CAST(@fecha AS date)`);

    if (existing.recordset.length) {
      for (const row of existing.recordset) {
        await new sql.Request(tx)
          .input("id", sql.Int, row.id)
          .input("tipo", sql.VarChar(15), type || String(row.tipo || "").trim())
          .input("observaciones", sql.VarChar(200), overtime === undefined ? row.observaciones || "" : withOvertime(row.observaciones, overtime))
          .query(`UPDATE Asistencias SET Tipo = @tipo, Observaciones = @observaciones WHERE IdAsistencia = @id`);
      }
    } else {
      await new sql.Request(tx)
        .input("companiaNueva", sql.Int, identity.companyId || 0)
        .input("empleado", sql.Int, identity.employeeId)
        .input("fecha", sql.VarChar(10), date)
        .input("tipo", sql.VarChar(15), type || "Puntual")
        .input("observaciones", sql.VarChar(200), withOvertime(OBSERVACION_ADMIN, overtime || 0))
        .query(`
          DECLARE @esIdentity int = COLUMNPROPERTY(OBJECT_ID('Asistencias'), 'IdAsistencia', 'IsIdentity');
          DECLARE @horaEntrada time = CASE WHEN COLUMNPROPERTY(OBJECT_ID('Asistencias'), 'HoraEntrada', 'AllowsNull') = 1
                                           THEN NULL ELSE CAST('00:00:00' AS time) END;
          IF @esIdentity = 1
            INSERT INTO Asistencias (Compania, IdEmpleado, Fecha, HoraEntrada, Tipo, Observaciones)
            VALUES (@companiaNueva, @empleado, CAST(@fecha AS date), @horaEntrada, @tipo, @observaciones);
          ELSE
          BEGIN
            DECLARE @nuevoId int = (SELECT ISNULL(MAX(IdAsistencia), 0) + 1 FROM Asistencias WITH (UPDLOCK, HOLDLOCK));
            INSERT INTO Asistencias (IdAsistencia, Compania, IdEmpleado, Fecha, HoraEntrada, Tipo, Observaciones)
            VALUES (@nuevoId, @companiaNueva, @empleado, CAST(@fecha AS date), @horaEntrada, @tipo, @observaciones);
          END`);
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  }
}

async function deleteRecord(identity, date) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("compania", sql.Int, identity.companyId || null)
    .input("empleado", sql.Int, identity.employeeId)
    .input("fecha", sql.VarChar(10), date)
    .query(`
      DELETE FROM Asistencias
      WHERE IdEmpleado = @empleado
        AND (@compania IS NULL OR Compania = @compania)
        AND CAST(Fecha AS date) = CAST(@fecha AS date)`);
  return result.rowsAffected[0];
}

// Edita la fecha y el motivo de un ascenso. Se identifica por empleado y fecha original (key).
// No cambia el puesto ni el departamento: eso es un movimiento de nómina.
async function updatePromotion(employeeId, key, date, reason) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("empleado", sql.Int, employeeId)
    .input("clave", sql.VarChar(23), key)
    .input("fecha", sql.VarChar(10), date)
    .input("motivo", sql.VarChar(MAX_MOTIVO), reason)
    .query(`
      UPDATE TOP (1) kio_tbSolIncrementoSueldo
         SET dtFechaPropuesta = CONVERT(datetime, @fecha, 23),
             vcMotivoModificacion = @motivo
       WHERE iIdEmpleado = @empleado
         AND CONVERT(varchar(23), dtFechaPropuesta, 126) = @clave`);
  return result.rowsAffected[0];
}

module.exports = {
  getEmployeeSheet, getUserIdentity, listRecords, setRecord, deleteRecord, updatePromotion,
  TIPOS_ASISTENCIA, MAX_MOTIVO, MAX_HORAS_EXTRA,
};
