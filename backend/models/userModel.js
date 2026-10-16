const { sql, getConnection } = require("../db");
const { buildClave } = require("../helpers/password");

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

// Se llama al iniciar sesión correctamente: deja constancia del último acceso del usuario.
async function updateLoginTimestamp(userId) {
  const pool = await getConnection();
  await pool
    .request()
    .input("usuario", sql.Int, userId)
    .query(`UPDATE kio_tbUsuarios SET dtFechaRegistro = GETDATE() WHERE iIdUsuario = @usuario`);
}

// ---- administración de usuarios (alta, baja y cambios) — solo para Administrador ----

async function listUsers() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT u.iIdUsuario, u.vcUsuario, u.bActivo, u.iIdCompania, u.iId, u.dtFechaRegistro,
           r.nombre, r.paterno, r.materno
    FROM kio_tbUsuarios u
    LEFT JOIN recursos r ON r.id = u.iId
    WHERE u.bBorrado = 0
    ORDER BY u.iIdUsuario`);

  return result.recordset.map((row) => ({
    id: row.iIdUsuario,
    username: row.vcUsuario,
    active: Boolean(row.bActivo),
    companyId: row.iIdCompania,
    employeeId: row.iId,
    name: [row.nombre, row.paterno, row.materno].filter(Boolean).join(" ").trim() || null,
    createdAt: row.dtFechaRegistro,
  }));
}

async function usernameExists(username, excludeId) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.VarChar(30), username)
    .input("excluir", sql.Int, excludeId ?? -1)
    .query(`SELECT TOP 1 1 AS found FROM kio_tbUsuarios WHERE vcUsuario = @usuario AND bBorrado = 0 AND iIdUsuario <> @excluir`);
  return result.recordset.length > 0;
}

// kio_tbUsuarios no tiene IDENTITY: se toma el siguiente id bajo bloqueo, como en el resto
// de tablas heredadas del sistema original (ver vacationModel/incidenceModel).
async function createUser({ username, password, employeeId, companyId }, actingUserId) {
  if (await usernameExists(username)) return { ok: false, error: "Ese nombre de usuario ya existe." };

  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const next = await new sql.Request(tx).query(
      `SELECT ISNULL(MAX(iIdUsuario), 0) + 1 AS id FROM kio_tbUsuarios WITH (UPDLOCK, HOLDLOCK)`
    );
    const id = next.recordset[0].id;

    await new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("registro", sql.Int, actingUserId)
      .input("usuario", sql.VarChar(30), username)
      .input("clave", sql.Binary(50), buildClave(password))
      .input("compania", sql.Int, companyId ?? 0)
      .input("empleado", sql.Int, employeeId ?? 0)
      .query(`
        INSERT INTO kio_tbUsuarios
          (iIdUsuario, iIdUsuarioRegistro, dtFechaRegistro, iIdCompania, iId, vcUsuario, vcClave,
           vcPreguntaSecreta, vcRespuestaSecreta, bActivo, dtFechaClave, bForrzarCambioClave, bBorrado)
        VALUES (@id, @registro, GETDATE(), @compania, @empleado, @usuario, @clave,
                '', '', 1, GETDATE(), 0, 0)`);

    await tx.commit();
    return { ok: true, id };
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  }
}

async function updateUser(id, { username, password, employeeId, companyId, active }) {
  if (username !== undefined && (await usernameExists(username, id))) {
    return { ok: false, error: "Ese nombre de usuario ya existe." };
  }

  const pool = await getConnection();
  const request = pool.request().input("id", sql.Int, id);
  const sets = ["dtFechaModificacion = GETDATE()"];

  if (username !== undefined) { sets.push("vcUsuario = @usuario"); request.input("usuario", sql.VarChar(30), username); }
  if (employeeId !== undefined) { sets.push("iId = @empleado"); request.input("empleado", sql.Int, employeeId); }
  if (companyId !== undefined) { sets.push("iIdCompania = @compania"); request.input("compania", sql.Int, companyId); }
  if (active !== undefined) { sets.push("bActivo = @activo"); request.input("activo", sql.Bit, active ? 1 : 0); }
  if (password) {
    sets.push("vcClave = @clave", "dtFechaClave = GETDATE()");
    request.input("clave", sql.Binary(50), buildClave(password));
  }

  const result = await request.query(`UPDATE kio_tbUsuarios SET ${sets.join(", ")} WHERE iIdUsuario = @id AND bBorrado = 0`);
  if (result.rowsAffected[0] === 0) return { ok: false, error: "Usuario no encontrado." };
  return { ok: true };
}

// Baja lógica: no se borra la fila, se marca bBorrado (igual que bBorradoReceptor en mensajes).
async function deleteUser(id) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .query(`UPDATE kio_tbUsuarios SET bBorrado = 1, bActivo = 0, dtFechaModificacion = GETDATE() WHERE iIdUsuario = @id AND bBorrado = 0`);
  if (result.rowsAffected[0] === 0) return { ok: false, error: "Usuario no encontrado." };
  return { ok: true };
}

module.exports = { findByUsername, updateLoginTimestamp, listUsers, createUser, updateUser, deleteUser };
