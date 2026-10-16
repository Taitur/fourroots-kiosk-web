const { sql, getConnection } = require("../db");

// Busca un usuario del kiosco por su nombre de usuario.
// El nombre real sale de `recursos` (u.iId = id del recurso/empleado) y el rol de administrador
// del parámetro KIOSKO.USUARIO_ADMINISTRADOR. Devuelve null si no existe.
async function findByUsername(username) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.VarChar(30), username)
    .query(`
      SELECT u.iIdUsuario, u.vcUsuario, u.vcClave, u.bActivo, u.bBorrado, u.iIdCompania, u.iId,
             r.nombre, r.paterno, r.materno,
             CASE WHEN p.valor = CAST(u.iIdUsuario AS varchar(60)) THEN 1 ELSE 0 END AS esAdmin
      FROM kio_tbUsuarios u
      LEFT JOIN recursos r ON r.id = u.iId
      OUTER APPLY (
        SELECT TOP 1 valor FROM parametros
        WHERE grupo = 'KIOSKO' AND variable = 'USUARIO_ADMINISTRADOR'
      ) p
      WHERE u.vcUsuario = @usuario`);

  const row = result.recordset[0];
  if (!row) return null;

  const fullName = [row.nombre, row.paterno, row.materno].filter(Boolean).map((s) => s.trim()).join(" ");
  const displayName = fullName || row.vcUsuario.charAt(0).toUpperCase() + row.vcUsuario.slice(1);

  return {
    id: row.iIdUsuario,
    username: row.vcUsuario,
    passwordHash: row.vcClave,
    active: row.bActivo && !row.bBorrado,
    companyId: row.iIdCompania,
    employeeId: row.iId,
    name: displayName,
    role: row.esAdmin ? "Administrador" : "Colaborador",
    initials: initialsOf(displayName),
  };
}

function initialsOf(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

module.exports = { findByUsername };
