const { sql, getConnection } = require('../db');

// ---- Nombres de tablas y columnas del videojuego de dibujos (ajústalos si cambian) ----
const T_DIBUJO = 'Juego_ConectArte';          // dibujos: Id_dibujo, Id_jugador, Id_prompt, puntos_*, img_dibujo
const T_JUGADOR_PUNTOS = 'JugadorPuntos';     // jugadores: Id_jugador, PuntosJugador (total de todos los juegos)
const T_PROMPT = 'Tabla_prompt';              // palabras: Id_prompt, Nombre_prompt
const SP_DIBUJO_ALEATORIO = 'dbo.usp_DibujoAleatorio';

// Columna de la tabla de dibujos que guarda cada tipo de puntos
const COLUMNA_PUNTOS = {
  adivinar: 'puntos_por_adivinar',
  calificacion: 'puntos_por_calificacion',
};

// Un prompt (palabra) al azar para la escena de dibujar
async function promptAleatorio() {
  const pool = await getConnection();
  const r = await pool.request().query(`
    SELECT TOP 1 Id_prompt AS id_prompt, Nombre_prompt AS nombre_prompt
    FROM ${T_PROMPT}
    ORDER BY NEWID()`);
  return r.recordset[0] || null;
}

// Guarda un dibujo nuevo. `png` es un Buffer con los bytes de la imagen.
// Id_dibujo se calcula como MAX+1 (igual que la API anterior). Si conviertes la columna a IDENTITY,
// quita Id_dibujo de la lista de columnas y el SELECT MAX(...) del VALUES.
async function guardarDibujo({ idJugador, idPrompt, png }) {
  const pool = await getConnection();
  const r = await pool.request()
    .input('jugador', sql.Int, idJugador)
    .input('prompt', sql.Int, idPrompt)
    .input('img', sql.VarBinary(sql.MAX), png)
    .query(`
      INSERT INTO ${T_DIBUJO} (Id_dibujo, Id_jugador, Id_prompt, puntos_por_adivinar, puntos_por_calificacion, img_dibujo)
      OUTPUT INSERTED.Id_dibujo AS id_dibujo
      VALUES ((SELECT ISNULL(MAX(Id_dibujo), 0) + 1 FROM ${T_DIBUJO} WITH (UPDLOCK, HOLDLOCK)),
              @jugador, @prompt, 0, 0, @img)`);
  return r.recordset[0].id_dibujo;
}

// Un dibujo al azar de OTRO jugador (usa el stored procedure usp_DibujoAleatorio).
// La imagen se devuelve en base64.
async function dibujoAleatorio(excluirJugadorId) {
  const pool = await getConnection();
  const r = await pool.request()
    .input('excluir', sql.Int, excluirJugadorId ?? null)
    .execute(SP_DIBUJO_ALEATORIO);

  const row = r.recordset[0];
  if (!row) return null;

  return {
    id_dibujo: row.Id_dibujo,
    id_jugador: row.Id_jugador,
    nombre_jugador: row.nombre_jugador,
    nombre_prompt: row.nombre_prompt,
    img_dibujo: row.img_dibujo ? Buffer.from(row.img_dibujo).toString('base64') : '',
  };
}

// Guarda los puntos en el dibujo y los suma al total de JugadorPuntos, todo en una transacción.
//   tipo = 'adivinar'     -> los puntos son para quien adivinó (idJugador)
//   tipo = 'calificacion' -> los puntos son para quien hizo el dibujo
// Devuelve null si el dibujo no existe.
async function registrarPuntos(tipo, { idDibujo, puntos, idJugador }) {
  const columna = COLUMNA_PUNTOS[tipo];
  if (!columna) throw new Error(`Tipo de puntos desconocido: ${tipo}`);

  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    // 1) Puntos en el dibujo + quién lo dibujó
    const dib = await new sql.Request(tx)
      .input('id', sql.Int, idDibujo)
      .input('puntos', sql.Int, puntos)
      .query(`
        UPDATE ${T_DIBUJO} SET ${columna} = @puntos WHERE Id_dibujo = @id;
        SELECT Id_jugador FROM ${T_DIBUJO} WHERE Id_dibujo = @id;`);

    const autor = dib.recordset[0] ? dib.recordset[0].Id_jugador : null;
    if (autor === null) {
      await tx.rollback();
      return null;
    }

    // 2) Suma al total del jugador que los ganó
    const ganador = tipo === 'calificacion' ? autor : idJugador;
    const total = await new sql.Request(tx)
      .input('jugador', sql.Int, ganador)
      .input('puntos', sql.Int, puntos)
      .query(`
        UPDATE ${T_JUGADOR_PUNTOS}
        SET PuntosJugador = ISNULL(PuntosJugador, 0) + @puntos
        WHERE Id_jugador = @jugador`);

    await tx.commit();

    const actualizado = total.rowsAffected[0] > 0;
    if (!actualizado) {
      console.warn(`dibujos: el jugador ${ganador} no existe en ${T_JUGADOR_PUNTOS}; no se sumaron puntos al total.`);
    }
    return { ok: true, total_actualizado: actualizado };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

module.exports = { promptAleatorio, guardarDibujo, dibujoAleatorio, registrarPuntos };
