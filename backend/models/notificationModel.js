const { sql, getConnection } = require("../db");

// Notificaciones = bandeja de entrada del usuario en kio_tbMensajes.

const MAX_DESC = 80;

async function getForUser(userId) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .query(`
      SELECT TOP 20 iIdMensaje, vcTitulo, CAST(tTexto AS varchar(max)) AS texto,
             COALESCE(dtFechaEnvio, dtFechaRegistro) AS fecha, bLeido
      FROM kio_tbMensajes
      WHERE iIdUsuarioReceptor = @usuario AND bEnviado = 1 AND bBorradoReceptor = 0
      ORDER BY COALESCE(dtFechaEnvio, dtFechaRegistro) DESC`);

  return result.recordset.map((m) => {
    const text = (m.texto || "").trim();
    return {
      id: String(m.iIdMensaje),
      title: m.vcTitulo,
      desc: text.length > MAX_DESC ? text.slice(0, MAX_DESC) + "…" : text,
      time: relativeTime(m.fecha),
      read: Boolean(m.bLeido),
    };
  });
}

// Devuelve true si el mensaje pertenece al usuario y se marcó como leído.
async function markRead(userId, messageId) {
  const id = Number(messageId);
  if (!Number.isInteger(id)) return false;

  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .input("id", sql.Int, id)
    .query(`
      UPDATE kio_tbMensajes SET bLeido = 1, dtFechaModificacion = GETDATE()
      WHERE iIdMensaje = @id AND iIdUsuarioReceptor = @usuario AND bBorradoReceptor = 0`);
  return result.rowsAffected[0] > 0;
}

async function markAllRead(userId) {
  const pool = await getConnection();
  await pool
    .request()
    .input("usuario", sql.Int, userId)
    .query(`
      UPDATE kio_tbMensajes SET bLeido = 1, dtFechaModificacion = GETDATE()
      WHERE iIdUsuarioReceptor = @usuario AND bBorradoReceptor = 0 AND bLeido = 0`);
}

function relativeTime(date) {
  if (!date) return "";
  const hours = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (hours < 1) return "Hace un momento";
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return new Date(date).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

// Id(s) del usuario Administrador (parámetro KIOSKO.USUARIO_ADMINISTRADOR).
async function getAdminIds() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT TOP 1 valor FROM parametros
    WHERE grupo = 'KIOSKO' AND variable = 'USUARIO_ADMINISTRADOR'`);

  const id = result.recordset[0] && Number(result.recordset[0].valor);
  return Number.isInteger(id) ? [id] : [];
}

// Envía un mensaje/notificación a un usuario. kio_tbMensajes no tiene IDENTITY: se toma
// el siguiente id bajo bloqueo, como en el resto de tablas heredadas del sistema original.
async function notify(receptorId, emisorId, titulo, texto) {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const next = await new sql.Request(tx).query(
      `SELECT ISNULL(MAX(iIdMensaje), 0) + 1 AS id FROM kio_tbMensajes WITH (UPDLOCK, HOLDLOCK)`
    );
    const id = next.recordset[0].id;

    await new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("receptor", sql.Int, receptorId)
      .input("emisor", sql.Int, emisorId)
      .input("titulo", sql.NVarChar(200), titulo)
      .input("texto", sql.NVarChar(sql.MAX), texto)
      .query(`
        INSERT INTO kio_tbMensajes
          (iIdMensaje, iIdUsuario, iIdUsuarioReceptor, iIdUsuarioEmisor, vcTitulo, tTexto,
           dtFechaEnvio, dtFechaRegistro, bLeido, bEnviado, bUrgente, bBorradoEmisor, bBorradoReceptor)
        VALUES (@id, @receptor, @receptor, @emisor, @titulo, @texto,
                GETDATE(), GETDATE(), 0, 1, 0, 0, 0)`);

    await tx.commit();
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  }
}

// Envía el mismo mensaje a varios destinatarios (p.ej. a todos los administradores).
async function notifyMany(receptorIds, emisorId, titulo, texto) {
  for (const receptorId of receptorIds) {
    await notify(receptorId, emisorId, titulo, texto);
  }
}

module.exports = { getForUser, markRead, markAllRead, getAdminIds, notify, notifyMany };
