const attendanceModel = require("../models/attendanceModel");
const userModel = require("../models/userModel");
const { isValidIso } = require("../helpers/dates");

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Ficha de un usuario. Un usuario solo puede ver la suya; un administrador puede pedir la de
// cualquier usuario de kio_tbUsuarios con ?user=<id>. Responde 403/404 y devuelve null si no se puede.
async function resolveSheetOwner(req, res) {
  const session = req.session.user;
  const requested = req.query.user;
  if (requested === undefined || toInt(requested) === session.id) return session;

  if (session.role !== "Administrador") {
    res.status(403).json({ error: "Solo un administrador puede ver la ficha de otro colaborador." });
    return null;
  }
  const userId = toInt(requested);
  const identity = userId && (await attendanceModel.getUserIdentity(userId));
  if (!identity) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return null;
  }
  return identity;
}

// Usuario del body o de la query de las rutas de edición (solo administrador). Para escribir en
// kio_tbMarcajes el usuario tiene que tener un empleado vinculado (columna iId de kio_tbUsuarios).
async function resolveTarget(source, res) {
  const userId = toInt(source && source.user);
  const identity = userId && (await attendanceModel.getUserIdentity(userId));
  if (!identity) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return null;
  }
  if (!identity.employeeId) {
    res.status(400).json({ error: "Este usuario no tiene un empleado vinculado; vincúlalo en Usuarios para llevar su asistencia." });
    return null;
  }
  return identity;
}

// Ficha de asistencia de Recursos Humanos: faltas, puntualidad, horas extra y ascensos.
// GET /api/attendance[?user=ID] — del usuario en sesión, o de otro colaborador si es administrador.
async function index(req, res) {
  const owner = await resolveSheetOwner(req, res);
  if (!owner) return;
  res.json(await attendanceModel.getEmployeeSheet(owner));
}

// GET /api/attendance/employees — usuarios de kio_tbUsuarios para el selector (solo administrador)
async function employees(req, res) {
  const list = (await userModel.listUsers())
    .map((u) => ({
      id: u.id,
      name: u.name || u.username,
      linked: Boolean(u.employeeId),
      active: u.active,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  res.json({ employees: list, types: attendanceModel.TIPOS_ASISTENCIA });
}

// GET /api/attendance/records?user=ID&month=YYYY-MM — registros del mes (solo administrador)
async function records(req, res) {
  if (!MONTH_RE.test(String(req.query.month || ""))) return res.status(400).json({ error: "Mes inválido." });
  const identity = await resolveTarget(req.query, res);
  if (!identity) return;
  res.json({ records: await attendanceModel.listRecords(identity, req.query.month) });
}

// PATCH /api/attendance/records   body: { user, date, type?, overtime? }
// Cambia el tipo del día y/o sus horas extra (0 a 12, de cuarto en cuarto de hora); crea el registro si no existe.
async function saveRecord(req, res) {
  const body = req.body || {};
  if (!isValidIso(body.date)) return res.status(400).json({ error: "Fecha inválida." });

  const type = body.type === undefined || body.type === "" ? undefined : body.type;
  if (type !== undefined && !attendanceModel.TIPOS_ASISTENCIA.includes(type)) return res.status(400).json({ error: "Tipo inválido." });

  let overtime;
  if (body.overtime !== undefined) {
    overtime = Number(body.overtime);
    if (!Number.isFinite(overtime) || overtime < 0 || overtime > attendanceModel.MAX_HORAS_EXTRA || (overtime * 4) % 1 !== 0) {
      return res.status(400).json({ error: `Las horas extra van de 0 a ${attendanceModel.MAX_HORAS_EXTRA}, de cuarto en cuarto de hora.` });
    }
  }
  if (type === undefined && !overtime) return res.status(400).json({ error: "Elige un tipo o indica horas extra." });

  const identity = await resolveTarget(body, res);
  if (!identity) return;
  try {
    await attendanceModel.setRecord(identity, body.date, { type, overtime });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    throw err;
  }
  res.json({ ok: true });
}

// DELETE /api/attendance/records   body: { user, date } — quita el registro del día
async function removeRecord(req, res) {
  const body = req.body || {};
  if (!isValidIso(body.date)) return res.status(400).json({ error: "Fecha inválida." });
  const identity = await resolveTarget(body, res);
  if (!identity) return;
  const removed = await attendanceModel.deleteRecord(identity, body.date);
  if (!removed) return res.status(404).json({ error: "Ese día no tiene registro." });
  res.json({ ok: true });
}

// PATCH /api/attendance/promotions   body: { user, key, date, reason } — edita fecha y motivo de un ascenso
async function savePromotion(req, res) {
  const body = req.body || {};
  const key = typeof body.key === "string" ? body.key : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!key) return res.status(400).json({ error: "Ascenso inválido." });
  if (!isValidIso(body.date)) return res.status(400).json({ error: "Fecha inválida." });
  if (reason.length > attendanceModel.MAX_MOTIVO) {
    return res.status(400).json({ error: `El motivo no puede pasar de ${attendanceModel.MAX_MOTIVO} caracteres.` });
  }
  const identity = await resolveTarget(body, res);
  if (!identity) return;
  const updated = await attendanceModel.updatePromotion(identity.employeeId, key, body.date, reason);
  if (!updated) return res.status(404).json({ error: "Ascenso no encontrado." });
  res.json({ ok: true });
}

module.exports = { index, employees, records, saveRecord, removeRecord, savePromotion };
