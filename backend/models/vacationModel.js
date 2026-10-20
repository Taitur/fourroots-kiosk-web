const { sql, getConnection } = require("../db");
const { getHolidays, toIsoDate } = require("../helpers/holidays");

// Días de vacaciones asignados por año. La BD no tiene una tabla con este dato;
// sustituir por el cálculo según antigüedad cuando se ligue el usuario con `empleados`.
const DIAS_ASIGNADOS = 15;

// Catálogos del sistema original.
const SOLICITUD_VACACIONES = 1; // kio_tbSolicitudes: "Vacaciones"
const ESTATUS_CANCELADA = 1; // KIO_TBESTATUSSOLICITUDES
const ESTATUS_ACEPTADA = 2;
const ESTATUS_EN_PROCESO = 3;
// Clave de movimiento de vacaciones en nómina (columna obligatoria, sin catálogo en la BD).
// Se usa 1, el mismo valor que ya tienen las solicitudes existentes.
const CLAVE_MVTO_VACACIONES = 1;

// ---- utilidades de fechas (siempre "YYYY-MM-DD", sin zonas horarias) ----

function parseIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(iso, n) {
  const date = parseIso(iso);
  date.setDate(date.getDate() + n);
  return toIsoDate(date);
}

function holidaySet(year) {
  return new Set(getHolidays(year).map((h) => h.date));
}

function isWorkingDay(iso, holidays) {
  const day = parseIso(iso).getDay();
  return day !== 0 && day !== 6 && !holidays.has(iso);
}

// ---- consultas ----

// Rangos de vacaciones del usuario (no canceladas) que tocan el año indicado.
async function getRequests(userId, year) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .input("anio", sql.Int, year)
    .input("cancelada", sql.Int, ESTATUS_CANCELADA)
    .query(`
      SELECT DISTINCT v.iIdSolicitudUsuario AS id,
             CONVERT(varchar(10), v.dtFechaInicio, 23) AS inicio,
             CONVERT(varchar(10), ISNULL(v.dtFechaFin, v.dtFechaInicio), 23) AS fin,
             ISNULL(v.iDias, 0) AS dias,
             su.tiEstatus AS estatus
      FROM kio_tbSolVacaciones v
      LEFT JOIN kio_tbSolicitudesUsuarios su ON su.iIdSolicitudUsuario = v.iIdSolicitudUsuario
      WHERE v.iIdUsuario = @usuario
        AND YEAR(v.dtFechaInicio) = @anio
        AND ISNULL(su.tiEstatus, 0) <> @cancelada
      ORDER BY inicio`);
  return result.recordset;
}

// Resumen para la página: saldo del año y días ya solicitados (para marcarlos en el calendario).
async function getSummary(userId, year) {
  // DISTINCT en la consulta: hay solicitudes con filas duplicadas en kio_tbSolVacaciones.
  const requests = await getRequests(userId, year);
  const holidays = holidaySet(year);

  const requestedDays = [];
  for (const r of requests) {
    for (let d = r.inicio; d <= r.fin; d = addDays(d, 1)) {
      if (isWorkingDay(d, holidays)) requestedDays.push(d);
    }
  }

  const usados = requests.reduce((sum, r) => sum + Number(r.dias), 0);
  return {
    year,
    disponibles: DIAS_ASIGNADOS,
    usados,
    restantes: Math.max(DIAS_ASIGNADOS - usados, 0),
    requestedDays,
  };
}

// Agrupa días laborables seleccionados en bloques continuos (los fines de semana y
// festivos intermedios no cortan el bloque). Cada bloque es una solicitud.
function groupIntoBlocks(days, holidays) {
  const blocks = [];
  let current = null;

  for (const day of days) {
    if (current) {
      let next = addDays(current.fin, 1);
      while (next < day && !isWorkingDay(next, holidays)) next = addDays(next, 1);
      if (next === day) {
        current.fin = day;
        current.dias++;
        continue;
      }
    }
    current = { inicio: day, fin: day, dias: 1 };
    blocks.push(current);
  }

  for (const b of blocks) {
    b.sabados = 0;
    b.domingos = 0;
    b.festivos = 0;
    for (let d = b.inicio; d <= b.fin; d = addDays(d, 1)) {
      const weekday = parseIso(d).getDay();
      if (weekday === 6) b.sabados++;
      else if (weekday === 0) b.domingos++;
      else if (holidays.has(d)) b.festivos++;
    }
    let regresa = addDays(b.fin, 1);
    while (!isWorkingDay(regresa, holidaySet(Number(regresa.slice(0, 4))))) regresa = addDays(regresa, 1);
    b.regresa = regresa;
  }
  return blocks;
}

// Valida y guarda una solicitud de vacaciones. Devuelve { ok, error?, solicitudes? }.
async function createRequest(user, rawDays, today = toIsoDate(new Date())) {
  const year = Number(today.slice(0, 4));
  const holidays = holidaySet(year);

  if (!Array.isArray(rawDays) || rawDays.length === 0) return { ok: false, error: "Selecciona al menos un día." };

  const days = [...new Set(rawDays)].sort();
  for (const d of days) {
    if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d) || toIsoDate(parseIso(d)) !== d) {
      return { ok: false, error: "Fecha inválida." };
    }
    if (Number(d.slice(0, 4)) !== year) return { ok: false, error: `Solo puedes solicitar días de ${year}.` };
    if (d < today) return { ok: false, error: "No puedes solicitar días pasados." };
    if (!isWorkingDay(d, holidays)) return { ok: false, error: "Solo se pueden solicitar días laborables." };
  }

  const summary = await getSummary(user.id, year);
  const alreadyRequested = new Set(summary.requestedDays);
  if (days.some((d) => alreadyRequested.has(d))) {
    return { ok: false, error: "Alguno de los días ya está solicitado." };
  }
  if (days.length > summary.restantes) {
    return { ok: false, error: `Solo te quedan ${summary.restantes} días disponibles.` };
  }

  const blocks = groupIntoBlocks(days, holidays);
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    for (const b of blocks) {
      // Las tablas no tienen IDENTITY: se toma el siguiente id de ambas tablas, bloqueándolas.
      const next = await new sql.Request(tx).query(`
        SELECT ISNULL(MAX(id), 0) + 1 AS id FROM (
          SELECT MAX(iIdSolicitudUsuario) AS id FROM kio_tbSolicitudesUsuarios WITH (UPDLOCK, HOLDLOCK)
          UNION ALL
          SELECT MAX(iIdSolicitudUsuario) FROM kio_tbSolVacaciones WITH (UPDLOCK, HOLDLOCK)
        ) ids`);
      const id = next.recordset[0].id;

      await new sql.Request(tx)
        .input("id", sql.Int, id)
        .input("usuario", sql.Int, user.id)
        .input("solicitud", sql.Int, SOLICITUD_VACACIONES)
        .input("estatus", sql.TinyInt, ESTATUS_EN_PROCESO)
        .query(`
          INSERT INTO kio_tbSolicitudesUsuarios
            (iIdSolicitudUsuario, iIdUsuario, dtFechaRegistro, iIdSolicitud, iIdUsuarioSolicitante, tiEstatus)
          VALUES (@id, @usuario, GETDATE(), @solicitud, @usuario, @estatus)`);

      await new sql.Request(tx)
        .input("id", sql.Int, id)
        .input("usuario", sql.Int, user.id)
        .input("inicio", sql.VarChar(10), b.inicio)
        .input("fin", sql.VarChar(10), b.fin)
        .input("regresa", sql.VarChar(10), b.regresa)
        .input("dias", sql.Decimal(18, 0), b.dias)
        .input("sabados", sql.SmallInt, b.sabados)
        .input("domingos", sql.SmallInt, b.domingos)
        .input("festivos", sql.SmallInt, b.festivos)
        .input("clave", sql.Int, CLAVE_MVTO_VACACIONES)
        .input("empleado", sql.Int, user.employeeId ?? null)
        .input("compania", sql.Int, user.companyId ?? null)
        .query(`
          INSERT INTO kio_tbSolVacaciones
            (iIdSolicitudUsuario, iIdUsuario, dtFechaRegistro, dtFechaInicio, iDias, iAntiguedad, clave_mvto,
             dtFechaFin, dtFechaRegresa, iDiasSabados, iDiasDomingos, iDiasFestivos, IIDEMPLEADO, IIDCOMPANIA)
          VALUES (@id, @usuario, GETDATE(), CAST(CONVERT(date, @inicio, 23) AS datetime), @dias, 0, @clave,
                  CAST(CONVERT(date, @fin, 23) AS datetime), CAST(CONVERT(date, @regresa, 23) AS datetime), @sabados, @domingos, @festivos,
                  @empleado, @compania)`);
      b.id = id;
    }
    await tx.commit();
  } catch (err) {
    // Si SQL Server ya abortó la transacción, rollback() también falla: se conserva el error original.
    await tx.rollback().catch(() => {});
    throw err;
  }

  return { ok: true, solicitudes: blocks };
}

// ---- administración (aprobar/rechazar) — solo Administrador ----

// Todas las solicitudes de vacaciones "en proceso", de cualquier usuario.
async function getPendingRequests() {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("solicitud", sql.Int, SOLICITUD_VACACIONES)
    .input("enProceso", sql.TinyInt, ESTATUS_EN_PROCESO)
    .query(`
      SELECT DISTINCT su.iIdSolicitudUsuario AS id, su.iIdUsuario AS usuarioId,
             CONVERT(varchar(10), su.dtFechaRegistro, 23) AS registro,
             CONVERT(varchar(10), v.dtFechaInicio, 23) AS inicio,
             CONVERT(varchar(10), ISNULL(v.dtFechaFin, v.dtFechaInicio), 23) AS fin,
             ISNULL(v.iDias, 0) AS dias,
             u.vcUsuario AS username,
             r.nombre, r.paterno, r.materno
      FROM kio_tbSolicitudesUsuarios su
      JOIN kio_tbSolVacaciones v ON v.iIdSolicitudUsuario = su.iIdSolicitudUsuario
      JOIN kio_tbUsuarios u ON u.iIdUsuario = su.iIdUsuario
      LEFT JOIN recursos r ON r.id = u.iId
      WHERE su.iIdSolicitud = @solicitud AND su.tiEstatus = @enProceso
      ORDER BY su.iIdSolicitudUsuario`);

  return result.recordset.map((row) => ({
    id: row.id,
    usuarioId: row.usuarioId,
    registro: row.registro,
    inicio: row.inicio,
    fin: row.fin,
    dias: row.dias,
    empleado: [row.nombre, row.paterno, row.materno].filter(Boolean).join(" ").trim() || row.username,
  }));
}

// Datos básicos de una solicitud (para notificar al usuario cuando se aprueba/rechaza).
async function getRequestInfo(id) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("solicitud", sql.Int, SOLICITUD_VACACIONES)
    .query(`
      SELECT DISTINCT su.iIdUsuario AS usuarioId,
             CONVERT(varchar(10), v.dtFechaInicio, 23) AS inicio,
             CONVERT(varchar(10), ISNULL(v.dtFechaFin, v.dtFechaInicio), 23) AS fin,
             ISNULL(v.iDias, 0) AS dias
      FROM kio_tbSolicitudesUsuarios su
      JOIN kio_tbSolVacaciones v ON v.iIdSolicitudUsuario = su.iIdSolicitudUsuario
      WHERE su.iIdSolicitudUsuario = @id AND su.iIdSolicitud = @solicitud`);

  return result.recordset[0] || null;
}

// Cambia el estatus de una solicitud que siga "En proceso" (aprobar o rechazar). Devuelve { ok, error? }.
async function setRequestStatus(id, estatus) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("solicitud", sql.Int, SOLICITUD_VACACIONES)
    .input("estatus", sql.TinyInt, estatus)
    .input("enProceso", sql.TinyInt, ESTATUS_EN_PROCESO)
    .query(`
      UPDATE kio_tbSolicitudesUsuarios SET tiEstatus = @estatus, dtFechaModificacion = GETDATE()
      WHERE iIdSolicitudUsuario = @id AND iIdSolicitud = @solicitud AND tiEstatus = @enProceso`);

  if (result.rowsAffected[0] === 0) return { ok: false, error: "Solicitud no encontrada o ya no está en proceso." };
  return { ok: true };
}

module.exports = {
  getSummary, createRequest, DIAS_ASIGNADOS,
  getPendingRequests, setRequestStatus, getRequestInfo,
  ESTATUS_CANCELADA, ESTATUS_ACEPTADA, ESTATUS_EN_PROCESO,
};
