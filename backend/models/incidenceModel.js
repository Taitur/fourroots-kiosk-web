const { sql, getConnection } = require("../db");
const { getType } = require("../helpers/incidenceTypes");
const { isValidIso, addDays, isWorkingDay, workingDaysBetween, toIsoDate } = require("../helpers/dates");

// Catálogos del sistema original.
const SOLICITUD_PERMISOS = 16; // kio_tbSolicitudes: "Proc. Permisos"
const ESTATUS_CANCELADA = 1; // KIO_TBESTATUSSOLICITUDES
const ESTATUS_ACEPTADA = 2;
const ESTATUS_EN_PROCESO = 3;
// kio_tbMotivosSolicitudes está vacía: no hay motivos que referenciar.
const ID_MOTIVO = 0;
const HORAS_POR_DIA = 8; // horas que se registran por día completo
const MAX_DIAS_RANGO = 30;
const MAX_DIAS_ATRAS = 30;
const MAX_DIAS_ADELANTE = 90;
const MAX_COMENTARIO = 200;

// ---- consultas ----

// Solicitudes de permisos del usuario, de la más reciente a la más antigua.
async function getRequests(userId) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .input("solicitud", sql.Int, SOLICITUD_PERMISOS)
    .query(`
      SELECT su.iIdSolicitudUsuario AS id, su.tiEstatus AS estatus,
             CONVERT(varchar(10), su.dtFechaRegistro, 23) AS registro,
             a.id_evento AS tipo,
             CONVERT(varchar(10), MIN(a.fecha_aplicacion), 23) AS inicio,
             CONVERT(varchar(10), MAX(a.fecha_aplicacion), 23) AS fin,
             COUNT(*) AS dias,
             SUM(a.solicitado_horas) AS horas,
             CONVERT(varchar(5), MIN(a.inicio), 108) AS horaInicio,
             CONVERT(varchar(5), MAX(a.fin), 108) AS horaFin,
             (SELECT TOP 1 e.vcDescripcion FROM kio_tbEventosSolAvisos e
              WHERE e.iIdSolicitudUsuario = su.iIdSolicitudUsuario) AS comentario
      FROM kio_tbSolicitudesUsuarios su
      JOIN kio_tbAvisosMultiples a ON a.iidsolicitudusuario = su.iIdSolicitudUsuario
      WHERE su.iIdUsuario = @usuario AND su.iIdSolicitud = @solicitud
      GROUP BY su.iIdSolicitudUsuario, su.tiEstatus, su.dtFechaRegistro, a.id_evento
      ORDER BY su.iIdSolicitudUsuario DESC`);

  return result.recordset.map((r) => {
    const type = getType(r.tipo);
    const byHours = type && type.mode === "hours";
    return {
      id: r.id,
      estatus: r.estatus,
      registro: r.registro,
      tipo: r.tipo,
      tipoNombre: type ? type.label : "Permiso",
      inicio: r.inicio,
      fin: r.fin,
      dias: r.dias,
      horas: r.horas,
      horaInicio: byHours ? r.horaInicio : null,
      horaFin: byHours ? r.horaFin : null,
      comentario: r.comentario || "",
    };
  });
}

// ---- alta ----

// Valida los datos del formulario y devuelve { ok: false, error } o { ok: true, type, days, ... }.
function validate(input, today) {
  const type = getType(input && input.type);
  if (!type) return { ok: false, error: "Selecciona un tipo de incidencia." };

  const date = input.date;
  if (!isValidIso(date)) return { ok: false, error: "Indica una fecha válida." };
  if (date < addDays(today, -MAX_DIAS_ATRAS)) return { ok: false, error: `No puedes solicitar fechas de hace más de ${MAX_DIAS_ATRAS} días.` };
  if (date > addDays(today, MAX_DIAS_ADELANTE)) return { ok: false, error: `No puedes solicitar fechas con más de ${MAX_DIAS_ADELANTE} días de anticipación.` };

  const comment = typeof input.comment === "string" ? input.comment.trim() : "";
  if (comment.length > MAX_COMENTARIO) return { ok: false, error: `El comentario no puede pasar de ${MAX_COMENTARIO} caracteres.` };
  if (type.commentRequired && !comment) return { ok: false, error: "Explica brevemente el motivo del permiso." };

  if (type.mode === "hours") {
    if (!isWorkingDay(date)) return { ok: false, error: "Solo se pueden solicitar días laborables." };

    const start = parseTime(input.startTime);
    const end = parseTime(input.endTime);
    if (start === null || end === null) return { ok: false, error: "Indica la hora de inicio y de fin." };
    if (end <= start) return { ok: false, error: "La hora de fin debe ser posterior a la de inicio." };

    return {
      ok: true, type, comment,
      days: [date],
      startMinutes: start,
      endMinutes: end,
      hoursPerDay: Math.ceil((end - start) / 60),
    };
  }

  const endDate = input.endDate || date;
  if (!isValidIso(endDate)) return { ok: false, error: "Indica una fecha final válida." };
  if (endDate < date) return { ok: false, error: "La fecha final no puede ser anterior a la inicial." };
  if (endDate > addDays(today, MAX_DIAS_ADELANTE)) return { ok: false, error: `No puedes solicitar fechas con más de ${MAX_DIAS_ADELANTE} días de anticipación.` };
  if (addDays(date, MAX_DIAS_RANGO - 1) < endDate) return { ok: false, error: `El permiso no puede durar más de ${MAX_DIAS_RANGO} días.` };

  const days = workingDaysBetween(date, endDate);
  if (days.length === 0) return { ok: false, error: "El rango no incluye ningún día laborable." };

  return { ok: true, type, comment, days, startMinutes: null, endMinutes: null, hoursPerDay: HORAS_POR_DIA };
}

// "HH:MM" -> minutos desde medianoche, o null si no es válida.
function parseTime(value) {
  const match = typeof value === "string" && /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h > 23 || m > 59 ? null : h * 60 + m;
}

// Valida y guarda una solicitud de permiso. Devuelve { ok, error? }.
async function createRequest(user, input, today = toIsoDate(new Date())) {
  const checked = validate(input, today);
  if (!checked.ok) return checked;
  const { type, comment, days } = checked;

  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    // Las tablas no tienen IDENTITY: se toma el siguiente id de todas las tablas que lo comparten.
    const next = await new sql.Request(tx).query(`
      SELECT ISNULL(MAX(id), 0) + 1 AS id FROM (
        SELECT MAX(iIdSolicitudUsuario) AS id FROM kio_tbSolicitudesUsuarios WITH (UPDLOCK, HOLDLOCK)
        UNION ALL SELECT MAX(iIdSolicitudUsuario) FROM kio_tbSolVacaciones WITH (UPDLOCK, HOLDLOCK)
        UNION ALL SELECT MAX(iidsolicitudusuario) FROM kio_tbAvisosMultiples WITH (UPDLOCK, HOLDLOCK)
        UNION ALL SELECT MAX(iIdSolicitudUsuario) FROM kio_tbEventosSolAvisos WITH (UPDLOCK, HOLDLOCK)
      ) ids`);
    const id = next.recordset[0].id;

    // No se permite más de una solicitud activa para el mismo día. Va dentro de la transacción
    // (con la tabla bloqueada arriba) para que dos envíos simultáneos no se cuelen.
    const overlap = await new sql.Request(tx)
      .input("usuario", sql.Int, user.id)
      .input("desde", sql.VarChar(10), days[0])
      .input("hasta", sql.VarChar(10), days[days.length - 1])
      .input("cancelada", sql.Int, ESTATUS_CANCELADA)
      .query(`
        SELECT TOP 1 CONVERT(varchar(10), fecha_aplicacion, 23) AS dia
        FROM kio_tbAvisosMultiples
        WHERE idusuario = @usuario AND estatus <> @cancelada
          AND fecha_aplicacion >= CAST(CONVERT(date, @desde, 23) AS datetime)
          AND fecha_aplicacion <  DATEADD(day, 1, CAST(CONVERT(date, @hasta, 23) AS datetime))
        ORDER BY fecha_aplicacion`);
    if (overlap.recordset.length) {
      await tx.rollback();
      return { ok: false, error: `Ya tienes una solicitud de permiso para el ${overlap.recordset[0].dia}.` };
    }

    await new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("usuario", sql.Int, user.id)
      .input("solicitud", sql.Int, SOLICITUD_PERMISOS)
      .input("estatus", sql.TinyInt, ESTATUS_EN_PROCESO)
      .query(`
        INSERT INTO kio_tbSolicitudesUsuarios
          (iIdSolicitudUsuario, iIdUsuario, dtFechaRegistro, iIdSolicitud, iIdUsuarioSolicitante, tiEstatus)
        VALUES (@id, @usuario, GETDATE(), @solicitud, @usuario, @estatus)`);

    for (const day of days) {
      const request = new sql.Request(tx)
        .input("id", sql.Int, id)
        .input("empleado", sql.Int, user.employeeId ?? 0)
        .input("nombre", sql.VarChar(100), user.name)
        .input("fecha", sql.VarChar(10), day)
        .input("evento", sql.Int, type.id)
        .input("usuario", sql.Int, user.id)
        .input("horas", sql.Int, checked.hoursPerDay)
        .input("motivo", sql.Int, ID_MOTIVO)
        .input("estatus", sql.Int, ESTATUS_EN_PROCESO)
        .input("comentario", sql.NVarChar(MAX_COMENTARIO), comment)
        .input("inicioMin", sql.Int, checked.startMinutes)
        .input("finMin", sql.Int, checked.endMinutes);

      await request.query(`
        DECLARE @dia datetime = CAST(CONVERT(date, @fecha, 23) AS datetime);

        INSERT INTO kio_tbAvisosMultiples
          (id_empleado, nombre, fecha_aplicacion, id_evento, idusuario, fecha_registro, fecha_modificacion,
           solicitado_horas, autorizado_horas, inicio, fin, id_motivo, iidsolicitudusuario, estatus)
        VALUES (@empleado, @nombre, @dia, @evento, @usuario, GETDATE(), GETDATE(),
                @horas, 0,
                CASE WHEN @inicioMin IS NULL THEN NULL ELSE DATEADD(minute, @inicioMin, @dia) END,
                CASE WHEN @finMin IS NULL THEN NULL ELSE DATEADD(minute, @finMin, @dia) END,
                @motivo, @id, @estatus);

        INSERT INTO kio_tbEventosSolAvisos (iIdSolicitudUsuario, iIdEvento, vcDescripcion, iIdMotivo, dtFechaAplicacion)
        VALUES (@id, @evento, NULLIF(@comentario, ''), @motivo, @dia);`);
    }
    await tx.commit();
  } catch (err) {
    // Si SQL Server ya abortó la transacción, rollback() también falla: se conserva el error original.
    await tx.rollback().catch(() => {});
    throw err;
  }

  return { ok: true };
}

// ---- cancelación ----

// Cancela una solicitud propia que siga "En proceso". Devuelve { ok, status?, error? }.
async function cancelRequest(userId, requestId) {
  const id = Number(requestId);
  if (!Number.isInteger(id)) return { ok: false, status: 404, error: "Solicitud no encontrada." };

  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const updated = await new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("usuario", sql.Int, userId)
      .input("solicitud", sql.Int, SOLICITUD_PERMISOS)
      .input("cancelada", sql.TinyInt, ESTATUS_CANCELADA)
      .input("enProceso", sql.TinyInt, ESTATUS_EN_PROCESO)
      .query(`
        UPDATE kio_tbSolicitudesUsuarios SET tiEstatus = @cancelada, dtFechaModificacion = GETDATE()
        WHERE iIdSolicitudUsuario = @id AND iIdUsuario = @usuario AND iIdSolicitud = @solicitud
          AND tiEstatus = @enProceso`);

    if (updated.rowsAffected[0] === 0) {
      await tx.rollback();
      return { ok: false, status: 409, error: "Solo se pueden cancelar tus solicitudes que siguen en proceso." };
    }

    await new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("cancelada", sql.Int, ESTATUS_CANCELADA)
      .query(`
        UPDATE kio_tbAvisosMultiples SET estatus = @cancelada, fecha_modificacion = GETDATE()
        WHERE iidsolicitudusuario = @id`);

    await tx.commit();
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  }
  return { ok: true };
}

// ---- administración (aprobar/rechazar) — solo Administrador ----

// Todas las solicitudes de permisos "en proceso", de cualquier usuario.
async function getPendingRequests() {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("solicitud", sql.Int, SOLICITUD_PERMISOS)
    .input("enProceso", sql.TinyInt, ESTATUS_EN_PROCESO)
    .query(`
      SELECT su.iIdSolicitudUsuario AS id, su.iIdUsuario AS usuarioId,
             CONVERT(varchar(10), su.dtFechaRegistro, 23) AS registro,
             a.id_evento AS tipo,
             CONVERT(varchar(10), MIN(a.fecha_aplicacion), 23) AS inicio,
             CONVERT(varchar(10), MAX(a.fecha_aplicacion), 23) AS fin,
             COUNT(*) AS dias,
             SUM(a.solicitado_horas) AS horas,
             CONVERT(varchar(5), MIN(a.inicio), 108) AS horaInicio,
             CONVERT(varchar(5), MAX(a.fin), 108) AS horaFin,
             u.vcUsuario AS username,
             r.nombre, r.paterno, r.materno,
             (SELECT TOP 1 e.vcDescripcion FROM kio_tbEventosSolAvisos e
              WHERE e.iIdSolicitudUsuario = su.iIdSolicitudUsuario) AS comentario
      FROM kio_tbSolicitudesUsuarios su
      JOIN kio_tbAvisosMultiples a ON a.iidsolicitudusuario = su.iIdSolicitudUsuario
      JOIN kio_tbUsuarios u ON u.iIdUsuario = su.iIdUsuario
      LEFT JOIN recursos r ON r.id = u.iId
      WHERE su.iIdSolicitud = @solicitud AND su.tiEstatus = @enProceso
      GROUP BY su.iIdSolicitudUsuario, su.iIdUsuario, su.dtFechaRegistro, a.id_evento,
               u.vcUsuario, r.nombre, r.paterno, r.materno
      ORDER BY su.iIdSolicitudUsuario DESC`);

  return result.recordset.map((r) => {
    const type = getType(r.tipo);
    const byHours = type && type.mode === "hours";
    return {
      id: r.id,
      usuarioId: r.usuarioId,
      empleado: [r.nombre, r.paterno, r.materno].filter(Boolean).join(" ").trim() || r.username,
      registro: r.registro,
      tipo: r.tipo,
      tipoNombre: type ? type.label : "Permiso",
      inicio: r.inicio,
      fin: r.fin,
      dias: r.dias,
      horas: r.horas,
      horaInicio: byHours ? r.horaInicio : null,
      horaFin: byHours ? r.horaFin : null,
      comentario: r.comentario || "",
    };
  });
}

// Datos básicos de una solicitud (para notificar al usuario cuando se aprueba/rechaza).
async function getRequestInfo(id) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("solicitud", sql.Int, SOLICITUD_PERMISOS)
    .query(`
      SELECT su.iIdUsuario AS usuarioId, a.id_evento AS tipo,
             CONVERT(varchar(10), MIN(a.fecha_aplicacion), 23) AS inicio,
             CONVERT(varchar(10), MAX(a.fecha_aplicacion), 23) AS fin
      FROM kio_tbSolicitudesUsuarios su
      JOIN kio_tbAvisosMultiples a ON a.iidsolicitudusuario = su.iIdSolicitudUsuario
      WHERE su.iIdSolicitudUsuario = @id AND su.iIdSolicitud = @solicitud
      GROUP BY su.iIdUsuario, a.id_evento`);

  const row = result.recordset[0];
  if (!row) return null;
  const type = getType(row.tipo);
  return { usuarioId: row.usuarioId, inicio: row.inicio, fin: row.fin, tipoNombre: type ? type.label : "Permiso" };
}

// Cambia el estatus de una solicitud que siga "En proceso" (aprobar o rechazar). Devuelve { ok, error? }.
async function setRequestStatus(id, estatus) {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const updated = await new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("solicitud", sql.Int, SOLICITUD_PERMISOS)
      .input("estatus", sql.TinyInt, estatus)
      .input("enProceso", sql.TinyInt, ESTATUS_EN_PROCESO)
      .query(`
        UPDATE kio_tbSolicitudesUsuarios SET tiEstatus = @estatus, dtFechaModificacion = GETDATE()
        WHERE iIdSolicitudUsuario = @id AND iIdSolicitud = @solicitud AND tiEstatus = @enProceso`);

    if (updated.rowsAffected[0] === 0) {
      await tx.rollback();
      return { ok: false, error: "Solicitud no encontrada o ya no está en proceso." };
    }

    await new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("estatus", sql.Int, estatus)
      .query(`
        UPDATE kio_tbAvisosMultiples SET estatus = @estatus, fecha_modificacion = GETDATE()
        WHERE iidsolicitudusuario = @id`);

    await tx.commit();
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  }
  return { ok: true };
}

module.exports = {
  getRequests, createRequest, cancelRequest,
  getPendingRequests, setRequestStatus, getRequestInfo,
  ESTATUS_CANCELADA, ESTATUS_ACEPTADA, ESTATUS_EN_PROCESO, MAX_COMENTARIO,
  MAX_DIAS_ATRAS, MAX_DIAS_ADELANTE, MAX_DIAS_RANGO,
};
