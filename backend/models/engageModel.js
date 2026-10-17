const { sql, getConnection } = require("../db");

// Comunidad interna (Engage): feed de noticias, encuestas, reconocimientos (aplausos)
// y cumpleaños del día. Todo sale de tablas reales de Capital Humano
// (kio_tbNoticias, kio_tbEncuestas, kio_tbEngageAplausos, recursos).

function fullName(nombre, paterno, materno) {
  return [nombre, paterno, materno].filter(Boolean).map((s) => s.trim()).join(" ");
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

// Publicaciones activas y vigentes, de la más reciente a la más antigua.
async function getFeed(limit = 20) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("limit", sql.Int, limit)
    .query(`
      SELECT TOP (@limit) n.iIdNoticia AS id, n.vcTitulo AS titulo, n.vcResumen AS resumen,
             CAST(n.tTexto AS varchar(max)) AS texto, n.dtFechaRegistro AS fecha,
             n.iIdUsuarioAutor AS autorId,
             r.nombre, r.paterno, r.materno
      FROM kio_tbNoticias n
      LEFT JOIN kio_tbUsuarios u ON u.iIdUsuario = n.iIdUsuarioAutor
      LEFT JOIN recursos r ON r.id = u.iId
      WHERE n.bActivo = 1 AND (n.dtFechaVigencia IS NULL OR n.dtFechaVigencia >= GETDATE())
      ORDER BY n.tiPrioridad DESC, n.dtFechaRegistro DESC`);

  return result.recordset.map((row) => ({
    id: row.id,
    title: row.titulo,
    text: ((row.texto || row.resumen || "").trim()),
    author: fullName(row.nombre, row.paterno, row.materno) || "Eslabón",
    authorId: row.autorId,
    time: relativeTime(row.fecha),
  }));
}

// Crea una noticia. kio_tbNoticias no tiene IDENTITY: se toma el siguiente id bajo bloqueo,
// como en el resto de tablas heredadas del sistema original.
async function createNews(userId, { title, text }) {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const next = await new sql.Request(tx).query(
      `SELECT ISNULL(MAX(iIdNoticia), 0) + 1 AS id FROM kio_tbNoticias WITH (UPDLOCK, HOLDLOCK)`
    );
    const id = next.recordset[0].id;

    await new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("usuario", sql.Int, userId)
      .input("titulo", sql.VarChar(100), title)
      .input("resumen", sql.VarChar(100), text.slice(0, 100))
      .input("texto", sql.VarChar(sql.MAX), text)
      .query(`
        INSERT INTO kio_tbNoticias
          (iIdNoticia, iIdUsuario, dtFechaRegistro, iIdUsuarioAutor, vcTitulo, vcResumen, tTexto, tiPrioridad, bActivo)
        VALUES (@id, @usuario, GETDATE(), @usuario, @titulo, @resumen, CAST(@texto AS varchar(max)), 0, 1)`);

    await tx.commit();
    return { ok: true, id };
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  }
}

// Edita una noticia. Solo su autor o un Administrador. Devuelve { ok, error? }.
async function updateNews(userId, isAdmin, newsId, { title, text }) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id", sql.Int, newsId)
    .input("usuario", sql.Int, userId)
    .input("admin", sql.Bit, isAdmin ? 1 : 0)
    .input("titulo", sql.VarChar(100), title)
    .input("resumen", sql.VarChar(100), text.slice(0, 100))
    .input("texto", sql.VarChar(sql.MAX), text)
    .query(`
      UPDATE kio_tbNoticias
      SET vcTitulo = @titulo, vcResumen = @resumen, tTexto = CAST(@texto AS varchar(max)),
          dtFechaModificacion = GETDATE()
      WHERE iIdNoticia = @id AND bActivo = 1 AND (iIdUsuarioAutor = @usuario OR @admin = 1)`);

  if (result.rowsAffected[0] === 0) return { ok: false, error: "Publicación no encontrada o sin permiso para editarla." };
  return { ok: true };
}

// Baja lógica: no se borra la fila, se marca bActivo = 0. Solo su autor o un Administrador.
async function deleteNews(userId, isAdmin, newsId) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id", sql.Int, newsId)
    .input("usuario", sql.Int, userId)
    .input("admin", sql.Bit, isAdmin ? 1 : 0)
    .query(`
      UPDATE kio_tbNoticias SET bActivo = 0, dtFechaModificacion = GETDATE()
      WHERE iIdNoticia = @id AND bActivo = 1 AND (iIdUsuarioAutor = @usuario OR @admin = 1)`);

  if (result.rowsAffected[0] === 0) return { ok: false, error: "Publicación no encontrada o sin permiso para eliminarla." };
  return { ok: true };
}

// Encuestas vigentes, sus opciones con número de votos y si el usuario ya votó
// (y por cuál opción).
async function getSurveys(userId, limit = 5) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT TOP (@limit) e.iIdEncuesta AS id, e.vcPregunta AS pregunta,
             (SELECT COUNT(*) FROM kio_tbencuestasusuario v WHERE v.iidencuesta = e.iIdEncuesta) AS votos,
             CASE WHEN EXISTS (
               SELECT 1 FROM kio_tbencuestasusuario v2
               WHERE v2.iidencuesta = e.iIdEncuesta AND v2.iidusuariovota = @usuario
             ) THEN 1 ELSE 0 END AS yaVoto
      FROM kio_tbEncuestas e
      WHERE e.smmostrar = 1 AND (e.dtVigencia IS NULL OR e.dtVigencia >= GETDATE())
      ORDER BY e.dtFechaRegistro DESC`);

  const surveys = result.recordset.map((row) => ({
    id: row.id,
    question: row.pregunta,
    votes: row.votos,
    voted: Boolean(row.yaVoto),
    options: [],
    myOption: null,
  }));
  if (surveys.length === 0) return surveys;

  // Opciones con su número de votos, y la que eligió este usuario.
  // Los ids salen de la BD (son enteros), por eso se pueden unir en el IN.
  const ids = surveys.map((s) => s.id).join(",");
  const opts = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .query(`
      SELECT o.iIdOpcion AS id, o.iIdEncuesta AS encuesta, o.vcOpcion AS texto,
             (SELECT COUNT(*) FROM kio_tbencuestasusuario v WHERE v.iIdOpcion = o.iIdOpcion) AS votos,
             (SELECT COUNT(*) FROM kio_tbencuestasusuario v2
              WHERE v2.iIdOpcion = o.iIdOpcion AND v2.iidusuariovota = @usuario) AS mio
      FROM kio_tbEncuestasOpciones o
      WHERE o.iIdEncuesta IN (${ids})
      ORDER BY o.iIdOpcion`);

  opts.recordset.forEach((o) => {
    const survey = surveys.find((s) => s.id === o.encuesta);
    survey.options.push({ id: o.id, text: o.texto, votes: o.votos });
    if (o.mio > 0) survey.myOption = o.id;
  });
  return surveys;
}

// Registra el voto de un usuario. Solo si la encuesta está vigente, la opción es de esa
// encuesta y el usuario no ha votado antes. Devuelve { ok, error? }.
async function voteSurvey(userId, surveyId, optionId) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("encuesta", sql.Int, surveyId)
    .input("opcion", sql.Int, optionId)
    .input("usuario", sql.Int, userId)
    .query(`
      INSERT INTO kio_tbencuestasusuario (iidencuesta, iidusuariovota, iIdOpcion, dtfecharegistro, dtfechamodificacion)
      SELECT @encuesta, @usuario, @opcion, GETDATE(), GETDATE()
      WHERE EXISTS (
              SELECT 1 FROM kio_tbEncuestas e
              JOIN kio_tbEncuestasOpciones o ON o.iIdEncuesta = e.iIdEncuesta
              WHERE e.iIdEncuesta = @encuesta AND o.iIdOpcion = @opcion
                AND e.smmostrar = 1 AND (e.dtVigencia IS NULL OR e.dtVigencia >= GETDATE()))
        AND NOT EXISTS (
              SELECT 1 FROM kio_tbencuestasusuario WITH (UPDLOCK, HOLDLOCK)
              WHERE iidencuesta = @encuesta AND iidusuariovota = @usuario)`);

  if (result.rowsAffected[0] === 0) {
    return { ok: false, error: "No se pudo registrar tu voto: ya votaste o la encuesta no está disponible." };
  }
  return { ok: true };
}

// Reconocimientos (aplausos) recientes entre compañeros.
async function getKudos(limit = 10) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("limit", sql.Int, limit)
    .query(`
      SELECT TOP (@limit) a.iIdAplauso AS id, a.iIdUsuarioDa AS giverId,
             a.NombreReconocido AS reconocido, a.vcMensaje AS mensaje, a.dtFecha AS fecha,
             u.vcUsuario AS usuario, r.nombre, r.paterno, r.materno
      FROM kio_tbEngageAplausos a
      LEFT JOIN kio_tbUsuarios u ON u.iIdUsuario = a.iIdUsuarioDa
      LEFT JOIN recursos r ON r.id = u.iId
      WHERE a.bActivo = 1
      ORDER BY a.iIdAplauso DESC`);

  return result.recordset.map((row) => ({
    id: row.id,
    name: row.reconocido,
    message: row.mensaje || "",
    giver: fullName(row.nombre, row.paterno, row.materno) || row.usuario || "Alguien",
    giverId: row.giverId,
    time: relativeTime(row.fecha),
  }));
}

// Da un aplauso a un compañero. Devuelve { ok, id }.
async function giveKudos(userId, { name, message }) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .input("nombre", sql.VarChar(150), name)
    .input("mensaje", sql.VarChar(300), message || null)
    .query(`
      INSERT INTO kio_tbEngageAplausos (iIdUsuarioDa, NombreReconocido, vcMensaje)
      OUTPUT INSERTED.iIdAplauso AS id
      VALUES (@usuario, @nombre, @mensaje)`);
  return { ok: true, id: result.recordset[0].id };
}

// Retira un aplauso (baja lógica). Solo quien lo dio o un Administrador.
async function deleteKudos(userId, isAdmin, kudosId) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id", sql.Int, kudosId)
    .input("usuario", sql.Int, userId)
    .input("admin", sql.Bit, isAdmin ? 1 : 0)
    .query(`
      UPDATE kio_tbEngageAplausos SET bActivo = 0
      WHERE iIdAplauso = @id AND bActivo = 1 AND (iIdUsuarioDa = @usuario OR @admin = 1)`);

  if (result.rowsAffected[0] === 0) return { ok: false, error: "Aplauso no encontrado o sin permiso para retirarlo." };
  return { ok: true };
}

// Cumpleaños de hoy, según la fecha de nacimiento en `recursos`.
async function getBirthdaysToday() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT r.id, r.nombre, r.paterno, r.materno
    FROM recursos r
    WHERE r.fecha_nacimiento IS NOT NULL
      AND MONTH(r.fecha_nacimiento) = MONTH(GETDATE())
      AND DAY(r.fecha_nacimiento) = DAY(GETDATE())`);

  return result.recordset.map((row) => ({
    id: row.id,
    name: fullName(row.nombre, row.paterno, row.materno),
  }));
}

module.exports = {
  getFeed, createNews, updateNews, deleteNews,
  getSurveys, voteSurvey,
  getKudos, giveKudos, deleteKudos,
  getBirthdaysToday,
};