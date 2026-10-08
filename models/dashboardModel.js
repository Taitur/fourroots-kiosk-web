const { sql, getConnection } = require("../db");

// Presentación de cada tipo de transacción (no existe en la BD).
const MODULE_STYLES = {
  1: { icon: "lock", gradient: "linear-gradient(135deg,#64748B,#334155)", description: "Cuenta y administración de accesos" },
  2: { icon: "campaign", gradient: "linear-gradient(135deg,#3B82F6,#7C3AED)", description: "Noticias, documentos y mensajes" },
  3: { icon: "search", gradient: "linear-gradient(135deg,#10B981,#0D9488)", description: "Consulta tu información personal y de nómina" },
  4: { icon: "assignment", gradient: "linear-gradient(135deg,#F59E0B,#EA580C)", description: "Solicitudes y autorizaciones" },
  5: { icon: "forum", gradient: "linear-gradient(135deg,#EC4899,#BE185D)", description: "Retroalimentación y desempeño" },
  7: { icon: "event", gradient: "linear-gradient(135deg,#06B6D4,#0E7490)", description: "Actividades de reclutamiento y selección" },
  8: { icon: "inventory_2", gradient: "linear-gradient(135deg,#8B5CF6,#6D28D9)", description: "Inventario de Recursos Humanos" },
  9: { icon: "insights", gradient: "linear-gradient(135deg,#EF4444,#B91C1C)", description: "Evaluaciones" },
};
const DEFAULT_STYLE = { icon: "apps", gradient: "linear-gradient(135deg,#6B7280,#374151)", description: "" };

// Transacciones que ya tienen página en este proyecto (iIdTransaccion -> ruta).
const IMPLEMENTED_PAGES = {
  2: "/Account/Logout",
  13: "/Engage/Index",
  21: "/Vacations/Index",
  34: "/Vacations/Index",
  47: "/Attendance/Index",
};

const APP_ICONS = {
  2: "logout", 3: "key", 4: "lock_reset", 13: "newspaper", 16: "description", 19: "mail",
  20: "receipt_long", 21: "beach_access", 25: "badge", 26: "school", 28: "cake",
  34: "beach_access", 47: "fact_check",
};

// "Entrar" no tiene sentido una vez iniciada la sesión.
const HIDDEN_TRANSACTIONS = [1];

// Módulos (tipos de transacción) con las aplicaciones a las que el usuario tiene permiso.
async function getModulesForUser(userId) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .query(`
      SELECT tt.iIdTipoTransaccion AS tipoId, tt.vcDescripcion AS tipo,
             t.iIdTransaccion AS id, t.vcDescripcion AS nombre
      FROM kio_tbTransaccionesUsuarios tu
      JOIN kio_tbTransacciones t ON t.iIdTransaccion = tu.iIdTransaccion
      JOIN kio_tbTiposTransacciones tt ON tt.iIdTipoTransaccion = t.iIdTipoTransaccion
      WHERE tu.iIdUsuario = @usuario AND t.bMostrarMenu = 1
        AND t.iIdTransaccion NOT IN (${HIDDEN_TRANSACTIONS.join(",")})
      ORDER BY tt.iOrden, t.iOrden, t.iIdTransaccion`);

  const modules = new Map();
  for (const row of result.recordset) {
    if (!modules.has(row.tipoId)) {
      const style = MODULE_STYLES[row.tipoId] || DEFAULT_STYLE;
      modules.set(row.tipoId, { id: String(row.tipoId), title: row.tipo, ...style, apps: [] });
    }
    const module = modules.get(row.tipoId);
    module.apps.push({
      id: String(row.id),
      name: row.nombre,
      desc: module.title,
      icon: APP_ICONS[row.id] || module.icon,
      url: IMPLEMENTED_PAGES[row.id] || null,
    });
  }
  return [...modules.values()];
}

// Empleados dados de alta (sin fecha de baja).
async function countActiveEmployees() {
  const pool = await getConnection();
  const result = await pool.request().query("SELECT COUNT(*) AS total FROM empleados WHERE fecha_baja IS NULL");
  return result.recordset[0].total;
}

module.exports = { getModulesForUser, countActiveEmployees };
