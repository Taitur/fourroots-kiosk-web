const { sql, getConnection } = require("../db");

// Ficha de asistencia de un colaborador: antigüedad y turno vienen de `empleados`,
// los ascensos de `kio_tbSolIncrementoSueldo` (único movimiento de puesto/sueldo real
// en la BD), y faltas/tardanzas/tempranas/horas extra de `kio_tbMarcajes` (marcajes
// diarios; ver scripts/seed_attendance_data.sql).

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Minutos de tolerancia respecto al horario programado antes de contar
// una llegada como tarde o temprano.
const TOLERANCE_MINUTES = 10;

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

// Marcajes diarios reales desde kio_tbMarcajes: cada fila es un día con su
// horario programado y lo que de verdad marcó el empleado (NULL = falta).
async function getAttendanceRecords(employeeId, year) {
  if (!employeeId) return [];
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id", sql.Int, employeeId)
    .input("year", sql.Int, year)
    .query(`
      SELECT dtFecha, dtHoraEntradaProgramada, dtHoraSalidaProgramada,
             dtHoraEntrada, dtHoraSalida, bFalta
      FROM kio_tbMarcajes
      WHERE iIdEmpleado = @id AND YEAR(dtFecha) = @year
      ORDER BY dtFecha`);
  return result.recordset;
}

function buildAttendanceMetrics(records, monthCount) {
  const faltas = new Array(monthCount).fill(0);
  const tardanzas = new Array(monthCount).fill(0);
  const tempranas = new Array(monthCount).fill(0);
  const horasExtra = new Array(monthCount).fill(0);

  records.forEach((r) => {
    const month = new Date(r.dtFecha).getMonth();
    if (month >= monthCount) return;

    if (r.bFalta || !r.dtHoraEntrada) {
      faltas[month]++;
      return;
    }

    if (r.dtHoraEntradaProgramada) {
      const diffMin = (new Date(r.dtHoraEntrada) - new Date(r.dtHoraEntradaProgramada)) / 60000;
      if (diffMin > TOLERANCE_MINUTES) tardanzas[month]++;
      else if (diffMin < -TOLERANCE_MINUTES) tempranas[month]++;
    }

    if (r.dtHoraSalida && r.dtHoraSalidaProgramada) {
      const extraMin = (new Date(r.dtHoraSalida) - new Date(r.dtHoraSalidaProgramada)) / 60000;
      if (extraMin > 0) horasExtra[month] += Math.round((extraMin / 60) * 100) / 100;
    }
  });

  return { faltas, tardanzas, tempranas, horasExtra };
}

async function getEmployeeSheet(user) {
  const now = new Date();
  const months = MONTH_LABELS.slice(0, now.getMonth() + 1);

  const [promotions, records] = await Promise.all([
    getPromotions(user.employeeId),
    getAttendanceRecords(user.employeeId, now.getFullYear()),
  ]);

  const ascensosPorMes = new Array(months.length).fill(0);
  promotions.forEach((p) => {
    if (p.upcoming || !p.rawDate || p.rawDate.getFullYear() !== now.getFullYear()) return;
    ascensosPorMes[p.rawDate.getMonth()]++;
  });

  const attendance = buildAttendanceMetrics(records, months.length);

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

// Tipos de asistencia que el administrador puede poner a un día.
const TIPOS_ASISTENCIA = ["Falta", "Retardo", "Temprano", "Puntual"];
const MAX_MOTIVO = 200;
const MAX_HORAS_EXTRA = 12;

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

// Tipo de un marcaje con la misma regla que buildAttendanceMetrics (falta, retardo, temprano o puntual).
function classifyMarcaje(r) {
  if (r.bFalta || !r.dtHoraEntrada) return "Falta";
  if (r.dtHoraEntradaProgramada) {
    const diffMin = (new Date(r.dtHoraEntrada) - new Date(r.dtHoraEntradaProgramada)) / 60000;
    if (diffMin > TOLERANCE_MINUTES) return "Retardo";
    if (diffMin < -TOLERANCE_MINUTES) return "Temprano";
  }
  return "Puntual";
}

// Horas extra de un marcaje: lo que pasó la salida real de la programada (redondeado a cuartos de hora).
function overtimeOfMarcaje(r) {
  if (r.bFalta || !r.dtHoraEntrada || !r.dtHoraSalida || !r.dtHoraSalidaProgramada) return 0;
  const extraMin = (new Date(r.dtHoraSalida) - new Date(r.dtHoraSalidaProgramada)) / 60000;
  return extraMin > 0 ? Math.round(extraMin / 15) / 4 : 0;
}

// Marcajes de kio_tbMarcajes en un mes (month = "YYYY-MM"): un renglón por día que tenga marcaje.
async function listRecords(identity, month) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("empleado", sql.Int, identity.employeeId)
    .input("inicio", sql.VarChar(10), month + "-01")
    .query(`
      SELECT CONVERT(varchar(10), dtFecha, 23) AS fecha, dtHoraEntradaProgramada, dtHoraSalidaProgramada,
             dtHoraEntrada, dtHoraSalida, bFalta
      FROM kio_tbMarcajes
      WHERE iIdEmpleado = @empleado
        AND dtFecha >= CAST(@inicio AS date)
        AND dtFecha < DATEADD(month, 1, CAST(@inicio AS date))
      ORDER BY dtFecha`);
  return result.recordset.map((r) => ({
    date: r.fecha,
    type: classifyMarcaje(r),
    overtime: overtimeOfMarcaje(r),
  }));
}

// Minutos de desfase de la entrada respecto a la programada para cada tipo (fuera de la tolerancia).
const DESFASE_ENTRADA = { Puntual: 0, Retardo: 25, Temprano: -20 };

// Guarda el día en kio_tbMarcajes, la misma tabla de la que lee la ficha del colaborador, así que el
// cambio se ve en su ficha. No hay columna de tipo ni de horas extra: se traducen a las horas del marcaje.
//  - Falta: bFalta = 1 y sin hora de entrada ni salida.
//  - Retardo / Temprano / Puntual: la entrada real queda 25 min después / 20 min antes / a la hora de la
//    programada (solo si el tipo cambia; si no, se respeta la hora que ya tenía).
//  - Horas extra: la salida real queda esas horas después de la salida programada.
// Si el día no tenía marcaje se crea con el mismo horario programado del último marcaje del empleado
// (09:00 a 18:00 si no tiene ninguno) y la compañía del usuario.
// type: Falta/Retardo/Temprano/Puntual o undefined para no cambiarlo; overtime: horas o undefined.
async function setRecord(identity, date, { type, overtime }) {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const existing = await new sql.Request(tx)
      .input("empleado", sql.Int, identity.employeeId)
      .input("fecha", sql.VarChar(10), date)
      .query(`
        SELECT iIdMarcaje AS id, dtHoraEntradaProgramada, dtHoraSalidaProgramada, dtHoraEntrada, dtHoraSalida, bFalta
        FROM kio_tbMarcajes WITH (UPDLOCK, HOLDLOCK)
        WHERE iIdEmpleado = @empleado AND dtFecha = CAST(@fecha AS date)`);
    const row = existing.recordset[0];

    const currentType = row ? classifyMarcaje(row) : null;
    const newType = type || currentType || "Puntual";
    const isFalta = newType === "Falta";
    const currentOvertime = row ? overtimeOfMarcaje(row) : 0;
    const hours = overtime === undefined ? currentOvertime : overtime;
    if (isFalta && hours > 0) {
      const err = new Error("Un día de falta no puede tener horas extra.");
      err.status = 400;
      throw err;
    }

    // Desfases en minutos contra el horario programado (null = sin marcar).
    let entradaMin = null;
    let salidaMin = null;
    if (!isFalta) {
      if (row && newType === currentType && row.dtHoraEntrada && row.dtHoraEntradaProgramada) {
        entradaMin = Math.round((new Date(row.dtHoraEntrada) - new Date(row.dtHoraEntradaProgramada)) / 60000);
      } else {
        entradaMin = DESFASE_ENTRADA[newType];
      }
      const currentSalidaMin = row && row.dtHoraSalida && row.dtHoraSalidaProgramada
        ? Math.round((new Date(row.dtHoraSalida) - new Date(row.dtHoraSalidaProgramada)) / 60000)
        : 0;
      if (hours > 0) salidaMin = Math.round(hours * 60);
      else salidaMin = currentSalidaMin < 0 ? currentSalidaMin : 0;
    }

    const request = new sql.Request(tx)
      .input("empleado", sql.Int, identity.employeeId)
      .input("compania", sql.Int, identity.companyId || 1)
      .input("fecha", sql.VarChar(10), date)
      .input("falta", sql.Bit, isFalta)
      .input("entradaMin", sql.Int, entradaMin)
      .input("salidaMin", sql.Int, salidaMin);

    if (row) {
      await request.input("id", sql.Int, row.id).query(`
        DECLARE @dia datetime = CAST(CAST(@fecha AS date) AS datetime);
        DECLARE @pe datetime = ISNULL((SELECT dtHoraEntradaProgramada FROM kio_tbMarcajes WHERE iIdMarcaje = @id), DATEADD(hour, 9, @dia));
        DECLARE @ps datetime = ISNULL((SELECT dtHoraSalidaProgramada FROM kio_tbMarcajes WHERE iIdMarcaje = @id), DATEADD(hour, 18, @dia));
        UPDATE kio_tbMarcajes
           SET dtHoraEntradaProgramada = @pe,
               dtHoraSalidaProgramada = @ps,
               dtHoraEntrada = CASE WHEN @entradaMin IS NULL THEN NULL ELSE DATEADD(minute, @entradaMin, @pe) END,
               dtHoraSalida = CASE WHEN @salidaMin IS NULL THEN NULL ELSE DATEADD(minute, @salidaMin, @ps) END,
               bFalta = @falta
         WHERE iIdMarcaje = @id`);
    } else {
      await request.query(`
        DECLARE @dia datetime = CAST(CAST(@fecha AS date) AS datetime);
        DECLARE @minE int = ISNULL((SELECT TOP 1 DATEDIFF(minute, CAST(dtFecha AS datetime), dtHoraEntradaProgramada)
                                    FROM kio_tbMarcajes WHERE iIdEmpleado = @empleado AND dtHoraEntradaProgramada IS NOT NULL
                                    ORDER BY dtFecha DESC), 540);
        DECLARE @minS int = ISNULL((SELECT TOP 1 DATEDIFF(minute, CAST(dtFecha AS datetime), dtHoraSalidaProgramada)
                                    FROM kio_tbMarcajes WHERE iIdEmpleado = @empleado AND dtHoraSalidaProgramada IS NOT NULL
                                    ORDER BY dtFecha DESC), 1080);
        INSERT INTO kio_tbMarcajes
          (iIdEmpleado, iIdCompania, dtFecha, dtHoraEntradaProgramada, dtHoraSalidaProgramada, dtHoraEntrada, dtHoraSalida, bFalta)
        VALUES (@empleado, @compania, CAST(@fecha AS date),
                DATEADD(minute, @minE, @dia), DATEADD(minute, @minS, @dia),
                CASE WHEN @entradaMin IS NULL THEN NULL ELSE DATEADD(minute, @minE + @entradaMin, @dia) END,
                CASE WHEN @salidaMin IS NULL THEN NULL ELSE DATEADD(minute, @minS + @salidaMin, @dia) END,
                @falta)`);
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
    .input("empleado", sql.Int, identity.employeeId)
    .input("fecha", sql.VarChar(10), date)
    .query(`DELETE FROM kio_tbMarcajes WHERE iIdEmpleado = @empleado AND dtFecha = CAST(@fecha AS date)`);
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
