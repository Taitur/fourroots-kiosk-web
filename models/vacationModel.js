const { sql, getConnection } = require("../db");

// Días de vacaciones asignados por año. La BD no tiene una tabla con este dato;
// sustituir por el cálculo según antigüedad cuando se ligue el usuario con `empleados`.
const DIAS_ASIGNADOS = 15;

// Resumen de vacaciones del usuario para el año indicado.
async function getSummary(userId, year) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .input("anio", sql.Int, year)
    .query(`
      SELECT ISNULL(SUM(iDias), 0) AS usados
      FROM kio_tbSolVacaciones
      WHERE iIdUsuario = @usuario AND YEAR(dtFechaInicio) = @anio`);

  const usados = Number(result.recordset[0].usados);
  return {
    year,
    disponibles: DIAS_ASIGNADOS,
    usados,
    restantes: Math.max(DIAS_ASIGNADOS - usados, 0),
  };
}

module.exports = { getSummary };
