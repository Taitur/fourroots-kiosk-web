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
    .input("limit", sql.Int, limit)
    .query(`
      SELECT TOP (@limit) e.iIdEncuesta AS id, e.vcPregunta AS pregunta
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

// Cumpleaños de todo el año (fecha de nacimiento en `recursos`), ordenados por
// mes y día, con los mensajes que recibió este año (kio_tbEngageCumpleMensajes).
async function getBirthdays() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT r.id, r.nombre, r.paterno, r.materno,
           MONTH(r.fecha_nacimiento) AS mes, DAY(r.fecha_nacimiento) AS dia
    FROM recursos r
    WHERE r.fecha_nacimiento IS NOT NULL
    ORDER BY MONTH(r.fecha_nacimiento), DAY(r.fecha_nacimiento)`);

  const hoy = new Date();
  const people = result.recordset.map((row) => ({
    id: row.id,
    name: fullName(row.nombre, row.paterno, row.materno),
    month: row.mes,
    day: row.dia,
    isToday: row.mes === hoy.getMonth() + 1 && row.dia === hoy.getDate(),
    messages: [],
  }));
  if (!people.length) return people;

  const byId = {};
  people.forEach((p) => { byId[p.id] = p; });

  const mensajes = await pool.request().query(`
    SELECT m.iIdRecurso AS recursoId, m.vcMensaje AS mensaje, m.dtFechaRegistro AS fecha,
           r.nombre, r.paterno, r.materno
    FROM kio_tbEngageCumpleMensajes m
    LEFT JOIN kio_tbUsuarios u ON u.iIdUsuario = m.iIdAutor
    LEFT JOIN recursos r ON r.id = u.iId
    WHERE YEAR(m.dtFechaRegistro) = YEAR(GETDATE())
    ORDER BY m.dtFechaRegistro ASC`);

  for (const row of mensajes.recordset) {
    const person = byId[row.recursoId];
    if (!person) continue;
    person.messages.push({
      text: row.mensaje,
      author: fullName(row.nombre, row.paterno, row.materno) || "Eslabón",
      time: relativeTime(row.fecha),
    });
  }

  return people;
}

// Deja un mensaje de cumpleaños a un compañero (recursos.id).
async function addBirthdayMessage(userId, recursoId, mensaje) {
  const limpio = (mensaje || "").trim();
  if (!limpio) return { ok: false, error: "Escribe un mensaje." };
  if (limpio.length > 300) return { ok: false, error: "El mensaje es demasiado largo (máximo 300 caracteres)." };

  const pool = await getConnection();
  const existe = await pool
    .request()
    .input("recurso", sql.Int, recursoId)
    .query(`SELECT id FROM recursos WHERE id = @recurso AND fecha_nacimiento IS NOT NULL`);
  if (!existe.recordset.length) {
    return { ok: false, error: "Ese compañero no existe." };
  }

  await pool
    .request()
    .input("recurso", sql.Int, recursoId)
    .input("autor", sql.Int, userId)
    .input("mensaje", sql.NVarChar(300), limpio)
    .query(`
      INSERT INTO kio_tbEngageCumpleMensajes (iIdRecurso, iIdAutor, vcMensaje)
      VALUES (@recurso, @autor, @mensaje)`);

  return { ok: true };
}

// Consejos de bienestar activos, del más apoyado al menos apoyado.
async function getTips(userId) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .query(`
      SELECT c.iIdConsejo AS id, c.vcTexto AS texto, c.dtFechaRegistro AS fecha,
             r.nombre, r.paterno, r.materno,
             (SELECT COUNT(*) FROM kio_tbEngageConsejosVotos v WHERE v.iIdConsejo = c.iIdConsejo) AS votos,
             (SELECT COUNT(*) FROM kio_tbEngageConsejosVotos v WHERE v.iIdConsejo = c.iIdConsejo AND v.iIdUsuario = @usuario) AS miVoto
      FROM kio_tbEngageConsejos c
      LEFT JOIN kio_tbUsuarios u ON u.iIdUsuario = c.iIdAutor
      LEFT JOIN recursos r ON r.id = u.iId
      WHERE c.bActivo = 1
      ORDER BY votos DESC, c.dtFechaRegistro DESC`);

  return result.recordset.map((row) => ({
    id: row.id,
    text: row.texto,
    author: fullName(row.nombre, row.paterno, row.materno) || "Eslabón",
    time: relativeTime(row.fecha),
    votes: row.votos,
    voted: row.miVoto > 0,
  }));
}

// Propone un consejo de bienestar nuevo.
async function createTip(userId, texto) {
  const limpio = (texto || "").trim();
  if (!limpio) return { ok: false, error: "Escribe tu consejo." };
  if (limpio.length > 500) return { ok: false, error: "El consejo es demasiado largo (máximo 500 caracteres)." };

  const pool = await getConnection();
  await pool
    .request()
    .input("autor", sql.Int, userId)
    .input("texto", sql.NVarChar(500), limpio)
    .query(`INSERT INTO kio_tbEngageConsejos (iIdAutor, vcTexto) VALUES (@autor, @texto)`);

  return { ok: true };
}

// Apoya un consejo, o retira el apoyo si ya lo había dado.
async function toggleTipVote(userId, consejoId) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("consejo", sql.Int, consejoId)
    .input("usuario", sql.Int, userId)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM kio_tbEngageConsejos WHERE iIdConsejo = @consejo AND bActivo = 1)
        SELECT 0 AS ok
      ELSE IF EXISTS (SELECT 1 FROM kio_tbEngageConsejosVotos WHERE iIdConsejo = @consejo AND iIdUsuario = @usuario)
      BEGIN
        DELETE FROM kio_tbEngageConsejosVotos WHERE iIdConsejo = @consejo AND iIdUsuario = @usuario;
        SELECT 1 AS ok
      END
      ELSE
      BEGIN
        INSERT INTO kio_tbEngageConsejosVotos (iIdConsejo, iIdUsuario) VALUES (@consejo, @usuario);
        SELECT 1 AS ok
      END`);

  if (!result.recordset[0].ok) return { ok: false, error: "El consejo ya no existe." };
  return { ok: true };
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
  createNews,
  updateNews,
  deleteNews,
  getSurveys,
  getKudos,
  giveKudos,
  deleteKudos,
  getBirthdays,
  addBirthdayMessage,
  getTips,
  createTip,
  toggleTipVote,
  castVote,
  getPosts,
  createPost,
  addComment,
};
