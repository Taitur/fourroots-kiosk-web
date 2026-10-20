const { sql, getConnection } = require("../db");

// Comunidad interna (Engage): feed de noticias, encuestas, reconocimientos (aplausos)
// y cumpleaños del día. Todo sale de tablas reales de Capital Humano
// (kio_tbNoticias, kio_tbEncuestas, kio_Apla_SolAplauso, recursos).

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
    time: relativeTime(row.fecha),
  }));
}

// Encuestas vigentes, con sus opciones (kio_tbEncuestasOpciones) y conteo de
// votos por opción (kio_tbencuestasusuario.iIdOpcion). Encuestas viejas sin
// opciones siguen funcionando como "solo participar" (opción = NULL).
async function getSurveys(userId, limit = 5) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("limit", sql.Int, limit)
    .query(`
      SELECT TOP (@limit) e.iIdEncuesta AS id, e.vcPregunta AS pregunta
      FROM kio_tbEncuestas e
      WHERE e.smmostrar = 1 AND (e.dtVigencia IS NULL OR e.dtVigencia >= GETDATE())
      ORDER BY e.dtFechaRegistro DESC`);

  const surveys = result.recordset.map((row) => ({
    id: row.id,
    question: row.pregunta,
    options: [],
    votes: 0,
    voted: false,
    votedOptionId: null,
  }));
  if (!surveys.length) return surveys;

  const surveyIds = surveys.map((s) => s.id);
  const request = pool.request();
  const placeholders = surveyIds.map((id, i) => {
    request.input("survey" + i, sql.Int, id);
    return "@survey" + i;
  });

  const [optionsResult, votesByOptionResult, votesByEncuestaResult, userVotesResult] = await Promise.all([
    request.query(`
      SELECT iIdOpcion AS id, iIdEncuesta AS encuestaId, vcOpcion AS texto
      FROM kio_tbEncuestasOpciones
      WHERE iIdEncuesta IN (${placeholders.join(",")})`),
    pool.request().query(`
      SELECT iIdOpcion AS opcionId, COUNT(*) AS votos
      FROM kio_tbencuestasusuario
      WHERE iIdOpcion IS NOT NULL
      GROUP BY iIdOpcion`),
    pool.request().query(`
      SELECT iidencuesta AS encuestaId, COUNT(*) AS votos
      FROM kio_tbencuestasusuario
      GROUP BY iidencuesta`),
    pool
      .request()
      .input("usuario", sql.Int, userId)
      .query(`
        SELECT iidencuesta AS encuestaId, iIdOpcion AS opcionId
        FROM kio_tbencuestasusuario
        WHERE iidusuariovota = @usuario`),
  ]);

  const votesByOption = {};
  for (const row of votesByOptionResult.recordset) votesByOption[row.opcionId] = row.votos;
  const votesByEncuesta = {};
  for (const row of votesByEncuestaResult.recordset) votesByEncuesta[row.encuestaId] = row.votos;

  const surveyById = {};
  surveys.forEach((s) => { surveyById[s.id] = s; });

  for (const row of optionsResult.recordset) {
    const survey = surveyById[row.encuestaId];
    if (!survey) continue;
    survey.options.push({ id: row.id, text: row.texto, votes: votesByOption[row.id] || 0 });
  }
  surveys.forEach((s) => {
    s.votes = s.options.length ? s.options.reduce((sum, o) => sum + o.votes, 0) : (votesByEncuesta[s.id] || 0);
  });

  for (const row of userVotesResult.recordset) {
    const survey = surveyById[row.encuestaId];
    if (!survey) continue;
    survey.voted = true;
    survey.votedOptionId = row.opcionId;
  }

  return surveys;
}

// Reconocimientos (aplausos) recientes entre compañeros.
async function getKudos(limit = 10) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("limit", sql.Int, limit)
    .query(`
      SELECT TOP (@limit) idSolicitudUsuario AS id, NombreEmpleado AS nombre, FechaElaboracion AS fecha
      FROM kio_Apla_SolAplauso
      ORDER BY idSolicitudUsuario DESC`);

  return result.recordset.map((row) => ({
    id: row.id,
    name: row.nombre,
    date: row.fecha,
  }));
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

// Registra el voto del usuario en una encuesta vigente, incluyendo la opción
// elegida (kio_tbEncuestasOpciones). Si la encuesta no tiene opciones, se
// mantiene el comportamiento anterior: solo registra la participación.
async function castVote(userId, encuestaId, optionId) {
  const pool = await getConnection();

  const vigente = await pool
    .request()
    .input("encuesta", sql.Int, encuestaId)
    .query(`
      SELECT iIdEncuesta FROM kio_tbEncuestas
      WHERE iIdEncuesta = @encuesta AND smmostrar = 1 AND (dtVigencia IS NULL OR dtVigencia >= GETDATE())`);
  if (!vigente.recordset.length) {
    return { ok: false, error: "La encuesta no existe o ya no está vigente." };
  }

  const opciones = await pool
    .request()
    .input("encuesta", sql.Int, encuestaId)
    .query(`SELECT iIdOpcion FROM kio_tbEncuestasOpciones WHERE iIdEncuesta = @encuesta`);

  let opcionIdValida = null;
  if (opciones.recordset.length) {
    if (!Number.isInteger(optionId)) {
      return { ok: false, error: "Selecciona una opción." };
    }
    const match = opciones.recordset.find((o) => o.iIdOpcion === optionId);
    if (!match) {
      return { ok: false, error: "Esa opción no pertenece a esta encuesta." };
    }
    opcionIdValida = optionId;
  }

  const yaVoto = await pool
    .request()
    .input("encuesta", sql.Int, encuestaId)
    .input("usuario", sql.Int, userId)
    .query(`
      SELECT 1 FROM kio_tbencuestasusuario
      WHERE iidencuesta = @encuesta AND iidusuariovota = @usuario`);
  if (yaVoto.recordset.length) {
    return { ok: false, error: "Ya votaste en esta encuesta." };
  }

  await pool
    .request()
    .input("encuesta", sql.Int, encuestaId)
    .input("usuario", sql.Int, userId)
    .input("opcion", sql.Int, opcionIdValida)
    .query(`
      INSERT INTO kio_tbencuestasusuario (iidencuesta, iidusuariovota, dtfecharegistro, dtfechamodificacion, iIdOpcion)
      VALUES (@encuesta, @usuario, GETDATE(), GETDATE(), @opcion)`);

  return { ok: true };
}

// Publicaciones de usuarios en el Home de Engage (kio_tbEngagePosts), con
// sus comentarios (kio_tbEngageComentarios), de la más reciente a la más
// antigua.
async function getPosts(limit = 20) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("limit", sql.Int, limit)
    .query(`
      SELECT TOP (@limit) p.iIdPost AS id, p.vcTexto AS texto, p.dtFechaRegistro AS fecha,
             r.nombre, r.paterno, r.materno
      FROM kio_tbEngagePosts p
      LEFT JOIN kio_tbUsuarios u ON u.iIdUsuario = p.iIdAutor
      LEFT JOIN recursos r ON r.id = u.iId
      ORDER BY p.dtFechaRegistro DESC`);

  const posts = result.recordset.map((row) => ({
    id: row.id,
    text: row.texto,
    author: fullName(row.nombre, row.paterno, row.materno) || "Eslabón",
    time: relativeTime(row.fecha),
    comments: [],
  }));
  if (!posts.length) return posts;

  const postsById = {};
  posts.forEach((p) => { postsById[p.id] = p; });

  const comentarios = await pool.request().query(`
    SELECT c.iIdComentario AS id, c.iIdPost AS postId, c.vcTexto AS texto, c.dtFechaRegistro AS fecha,
           r.nombre, r.paterno, r.materno
    FROM kio_tbEngageComentarios c
    LEFT JOIN kio_tbUsuarios u ON u.iIdUsuario = c.iIdAutor
    LEFT JOIN recursos r ON r.id = u.iId
    ORDER BY c.dtFechaRegistro ASC`);

  for (const row of comentarios.recordset) {
    const post = postsById[row.postId];
    if (!post) continue;
    post.comments.push({
      id: row.id,
      text: row.texto,
      author: fullName(row.nombre, row.paterno, row.materno) || "Eslabón",
      time: relativeTime(row.fecha),
    });
  }

  return posts;
}

// Crea una publicación nueva en el Home de Engage.
async function createPost(userId, texto) {
  const limpio = (texto || "").trim();
  if (!limpio) return { ok: false, error: "Escribe algo para publicar." };

  const pool = await getConnection();
  await pool
    .request()
    .input("autor", sql.Int, userId)
    .input("texto", sql.NVarChar(sql.MAX), limpio)
    .query(`
      INSERT INTO kio_tbEngagePosts (iIdAutor, vcTexto, dtFechaRegistro)
      VALUES (@autor, @texto, GETDATE())`);

  return { ok: true };
}

// Agrega un comentario (respuesta) a una publicación existente.
async function addComment(userId, postId, texto) {
  const limpio = (texto || "").trim();
  if (!limpio) return { ok: false, error: "Escribe una respuesta." };
  if (limpio.length > 500) return { ok: false, error: "La respuesta es demasiado larga (máximo 500 caracteres)." };

  const pool = await getConnection();

  const existe = await pool
    .request()
    .input("post", sql.Int, postId)
    .query(`SELECT iIdPost FROM kio_tbEngagePosts WHERE iIdPost = @post`);
  if (!existe.recordset.length) {
    return { ok: false, error: "La publicación ya no existe." };
  }

  await pool
    .request()
    .input("post", sql.Int, postId)
    .input("autor", sql.Int, userId)
    .input("texto", sql.NVarChar(500), limpio)
    .query(`
      INSERT INTO kio_tbEngageComentarios (iIdPost, iIdAutor, vcTexto, dtFechaRegistro)
      VALUES (@post, @autor, @texto, GETDATE())`);

  return { ok: true };
}

module.exports = {
  getFeed,
  getSurveys,
  getKudos,
  getBirthdaysToday,
  castVote,
  getPosts,
  createPost,
  addComment,
};
