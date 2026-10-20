const vacationModel = require("../models/vacationModel");
const notificationModel = require("../models/notificationModel");
const { getHolidays, toIsoDate } = require("../helpers/holidays");

// GET /api/vacations — saldo del año y datos para pintar el calendario
async function index(req, res) {
  const today = toIsoDate(new Date());
  const year = Number(today.slice(0, 4));
  const summary = await vacationModel.getSummary(req.session.user.id, year);

  res.json({
    today,
    year,
    holidays: getHolidays(year),
    requestedDays: summary.requestedDays,
    restantes: summary.restantes,
    summary,
  });
}

// POST /api/vacations/requests   body: { days: ["YYYY-MM-DD", ...] }
async function request(req, res) {
  if (req.session.user.role === "Administrador") {
    return res.status(403).json({ error: "Un administrador no puede solicitar vacaciones." });
  }
  const result = await vacationModel.createRequest(req.session.user, req.body && req.body.days);
  if (!result.ok) return res.status(400).json({ error: result.error });

  const admins = await notificationModel.getAdminIds();
  for (const b of result.solicitudes) {
    const rango = b.inicio === b.fin ? b.inicio : `${b.inicio} al ${b.fin}`;
    await notificationModel.notifyMany(
      admins,
      req.session.user.id,
      "Nueva solicitud de vacaciones",
      `${req.session.user.name} solicitó vacaciones del ${rango} (${b.dias} día${b.dias === 1 ? "" : "s"}).`
    );
  }

  const summary = await vacationModel.getSummary(req.session.user.id, new Date().getFullYear());
  res.json({ solicitudes: result.solicitudes, summary });
}

// ---- administración (aprobar/rechazar) — solo Administrador ----

// GET /api/vacations/requests — solicitudes "en proceso" de todos los usuarios
async function adminList(req, res) {
  res.json({ requests: await vacationModel.getPendingRequests() });
}

// POST /api/vacations/requests/:id/approve
async function approve(req, res) {
  const info = await vacationModel.getRequestInfo(req.params.id);
  const result = await vacationModel.setRequestStatus(req.params.id, vacationModel.ESTATUS_ACEPTADA);
  if (!result.ok) return res.status(409).json({ error: result.error });

  if (info) {
    const rango = info.inicio === info.fin ? info.inicio : `${info.inicio} al ${info.fin}`;
    await notificationModel.notify(
      info.usuarioId, req.session.user.id,
      "Vacaciones aprobadas",
      `Tu solicitud de vacaciones del ${rango} fue aprobada.`
    );
  }
  res.json({ requests: await vacationModel.getPendingRequests() });
}

// POST /api/vacations/requests/:id/reject
async function reject(req, res) {
  const info = await vacationModel.getRequestInfo(req.params.id);
  const result = await vacationModel.setRequestStatus(req.params.id, vacationModel.ESTATUS_CANCELADA);
  if (!result.ok) return res.status(409).json({ error: result.error });

  if (info) {
    const rango = info.inicio === info.fin ? info.inicio : `${info.inicio} al ${info.fin}`;
    await notificationModel.notify(
      info.usuarioId, req.session.user.id,
      "Vacaciones rechazadas",
      `Tu solicitud de vacaciones del ${rango} fue rechazada.`
    );
  }
  res.json({ requests: await vacationModel.getPendingRequests() });
}

module.exports = { index, request, adminList, approve, reject };
