const { sql, getConnection } = require('../db');

const OFICINAS = ['Oficina1','Oficina2','Oficina3','Oficina4','Oficina5','Oficina6','Oficina7','Oficina8'];
const SLOTS = 8;

const SELECT_PREGUNTA = (top = '') => `
  SELECT ${top} p.iIdPregunta AS id, p.vcEnunciado AS question, d.vcNombre AS relatedDepartment,
         ISNULL(p.vcRespuesta, '') AS response, a.vcNombre AS relatedPlayerName,
         ISNULL(r.vcNombre, '') AS responsePlayerName, p.vcOficinaId AS oficinaId, p.iSlotIndex AS slotIndex
  FROM kio_tbPreguntasCreadas p
  JOIN kio_tbDepartamentos d ON d.iIdDepartamento = p.iIdDepartamento
  JOIN kio_tbJugadores a ON a.iIdJugador = p.iIdAutor
  LEFT JOIN kio_tbJugadores r ON r.iIdJugador = p.iIdRespondedor `;

async function login({ nombre, puesto, expertise, departamento }) {
  const pool = await getConnection();
  const r = await pool.request()
    .input('nombre', sql.NVarChar, nombre)
    .input('puesto', sql.NVarChar, puesto)
    .input('expertise', sql.NVarChar, expertise)
    .input('depto', sql.NVarChar, departamento)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM kio_tbJugadores WHERE vcNombre = @nombre)
        INSERT INTO kio_tbJugadores (vcNombre, vcPuesto, vcExpertise, iIdDepartamento)
        SELECT @nombre, @puesto, @expertise, iIdDepartamento FROM kio_tbDepartamentos WHERE vcNombre = @depto;
      SELECT j.iIdJugador AS id, j.vcNombre AS nombre, ISNULL(j.vcPuesto,'') AS puesto,
             ISNULL(j.vcExpertise,'') AS expertise, d.vcNombre AS usuarioDepartamento, j.iPuntos AS puntos
      FROM kio_tbJugadores j JOIN kio_tbDepartamentos d ON d.iIdDepartamento = j.iIdDepartamento
      WHERE j.vcNombre = @nombre;`);
  return r.recordset[0] || null;
}

// Primer slot libre empezando por la oficina pedida. null si todo está lleno.
async function crearPregunta({ autorId, departamento, enunciado, oficinaId }) {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const ocupados = await new sql.Request(tx).query(
      'SELECT vcOficinaId, iSlotIndex FROM kio_tbPreguntasCreadas WITH (UPDLOCK, HOLDLOCK)');
    const usados = new Set(ocupados.recordset.map(o => `${o.vcOficinaId}|${o.iSlotIndex}`));

    const inicio = Math.max(0, OFICINAS.indexOf(oficinaId));
    let oficina = null, slot = -1;
    for (let k = 0; k < OFICINAS.length && slot < 0; k++) {
      const of = OFICINAS[(inicio + k) % OFICINAS.length];
      for (let s = 0; s < SLOTS; s++) {
        if (!usados.has(`${of}|${s}`)) { oficina = of; slot = s; break; }
      }
    }
    if (slot < 0) { await tx.rollback(); return null; }

    const ins = await new sql.Request(tx)
      .input('autor', sql.Int, autorId)
      .input('depto', sql.NVarChar, departamento)
      .input('texto', sql.NVarChar, enunciado)
      .input('oficina', sql.NVarChar, oficina)
      .input('slot', sql.Int, slot)
      .query(`
        INSERT INTO kio_tbPreguntasCreadas (iIdAutor, iIdDepartamento, vcEnunciado, vcOficinaId, iSlotIndex)
        OUTPUT INSERTED.iIdPregunta AS id
        SELECT @autor, iIdDepartamento, @texto, @oficina, @slot FROM kio_tbDepartamentos WHERE vcNombre = @depto;`);
    await tx.commit();
    return { id: ins.recordset[0].id, oficinaId: oficina, slotIndex: slot };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

async function listarPreguntas() {
  const pool = await getConnection();
  const r = await pool.request().query(SELECT_PREGUNTA() + 'ORDER BY p.dtFechaCreacion');
  return r.recordset;
}

async function responder(preguntaId, respondedorId, respuesta) {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const jug = await new sql.Request(tx)
      .input('resp', sql.Int, respondedorId)
      .query('SELECT 1 FROM kio_tbJugadores WHERE iIdJugador = @resp;');
    if (jug.recordset.length === 0) { await tx.rollback(); return false; }

    const upd = await new sql.Request(tx)
      .input('id', sql.Int, preguntaId)
      .input('resp', sql.Int, respondedorId)
      .input('texto', sql.NVarChar, respuesta)
      .query(`
        UPDATE kio_tbPreguntasCreadas SET vcRespuesta = @texto, iIdRespondedor = @resp, dtFechaRespuesta = GETDATE()
        WHERE iIdPregunta = @id AND vcRespuesta IS NULL AND iIdAutor <> @resp;`);
    if (upd.rowsAffected[0] === 0) { await tx.rollback(); return false; }

    await new sql.Request(tx)
      .input('resp', sql.Int, respondedorId)
      .query('UPDATE kio_tbJugadores SET iPuntos = iPuntos + 10 WHERE iIdJugador = @resp;');
    await tx.commit();
    return true;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

async function matchmaking(jugadorId) {
  const pool = await getConnection();
  const r = await pool.request()
    .input('yo', sql.Int, jugadorId)
    .query(SELECT_PREGUNTA('TOP 1') + `
      WHERE p.vcRespuesta IS NULL AND p.iIdAutor <> @yo
      ORDER BY CASE WHEN p.iIdDepartamento <>
               (SELECT iIdDepartamento FROM kio_tbJugadores WHERE iIdJugador = @yo) THEN 0 ELSE 1 END,
               p.dtFechaCreacion`);
  return r.recordset[0] || null;
}

module.exports = { login, crearPregunta, listarPreguntas, responder, matchmaking };