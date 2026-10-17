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

// Encuestas vigentes y si el usuario ya votó en cada una (kio_tbencuestasusuario
// solo registra que el usuario votó, no la opción elegida).
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

  return result.recordset.map((row) => ({
    id: row.id,
    question: row.pregunta,
    votes: row.votos,
    voted: Boolean(row.yaVoto),
  }));
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

module.exports = { getFeed, getSurveys, getKudos, getBirthdaysToday };
