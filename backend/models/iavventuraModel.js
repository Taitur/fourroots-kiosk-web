const { sql, getConnection } = require('../db');

// ---- Nombres de tablas y stored procedures del videojuego IAvventura ----
const SP_PREGUNTAS = 'dbo.get_question_for_category';   // lee kio_tbPregunta por categoría

// Preguntas de una categoria (usa el stored procedure get_question_for_category)
async function preguntasPorCategoria(categoria) {
  const pool = await getConnection();
  const r = await pool.request()
    .input('categoria', sql.VarChar(100), categoria)
    .execute(SP_PREGUNTAS);

  return r.recordset.map(row => ({
    idPregunta: row.idPregunta,
    categoria: row.categoria,
    pregunta: row.pregunta,
    respuesta1: row.respuesta1,
    respuesta2: row.respuesta2,
    respuesta3: row.respuesta3,
    respuesta4: row.respuesta4,
    respuestaCorrecta: row.respuestaCorrecta,
  }));
}

module.exports = { preguntasPorCategoria};
