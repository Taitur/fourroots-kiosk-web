const incidenceModel = require("../models/incidenceModel");
const notificationModel = require("../models/notificationModel");
const { INCIDENCE_TYPES, getType } = require("../helpers/incidenceTypes");
const { toIsoDate } = require("../helpers/dates");

// GET /api/incidences — tipos, límites, estados y solicitudes del usuario
async function index(req, res) {
  res.json({
    today: toIsoDate(new Date()),
    types: INCIDENCE_TYPES,
    requests: await incidenceModel.getRequests(req.session.user.id),
    status: {
      cancelada: incidenceModel.ESTATUS_CANCELADA,
      aceptada: incidenceModel.ESTATUS_ACEPTADA,
      enProceso: incidenceModel.ESTATUS_EN_PROCESO,
    },
    limits: {
      daysBack: incidenceModel.MAX_DIAS_ATRAS,
      daysAhead: incidenceModel.MAX_DIAS_ADELANTE,
      maxRange: incidenceModel.MAX_DIAS_RANGO,
      maxComment: incidenceModel.MAX_COMENTARIO,
    },
  });
}

// POST /api/incidences/requests   body: { type, date, endDate?, startTime?, endTime?, comment? }
async function request(req, res) {
  if (req.session.user.role === "Administrador") {
    return res.status(403).json({ error: "Un administrador no puede solicitar incidencias." });
  }
  const result = await incidenceModel.createRequest(req.session.user, req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });

  const type = getType(req.body && req.body.type);
  const date = req.body && req.body.date;
  const endDate = req.body && req.body.endDate;
  const rango = endDate && endDate !== date ? `${date} al ${endDate}` : date;
  const admins = await notificationModel.getAdminIds();
  await notificationModel.notifyMany(
    admins,
    req.session.user.id,
    "Nueva solicitud de permiso",
    `${req.session.user.name} solicitó un permiso de ${type ? type.label : "Permiso"} para el ${rango}.`
  );

  res.json({ requests: await incidenceModel.getRequests(req.session.user.id) });
}

// POST /api/incidences/requests/:id/cancel
async function cancel(req, res) {
  const result = await incidenceModel.cancelRequest(req.session.user.id, req.params.id);
  if (!result.ok) return res.status(result.status).json({ error: result.error });

  res.json({ requests: await incidenceModel.getRequests(req.session.user.id) });
}

// ---- administración (aprobar/rechazar) — solo Administrador ----

// GET /api/incidences/requests — solicitudes "en proceso" de todos los usuarios
async function adminList(req, res) {
  res.json({ requests: await incidenceModel.getPendingRequests() });
}

// POST /api/incidences/requests/:id/approve
async function approve(req, res) {
  const info = await incidenceModel.getRequestInfo(req.params.id);
  const result = await incidenceModel.setRequestStatus(req.params.id, incidenceModel.ESTATUS_ACEPTADA);
  if (!result.ok) return res.status(409).json({ error: result.error });

  if (info) {
    const rango = info.inicio === info.fin ? info.inicio : `${info.inicio} al ${info.fin}`;
    await notificationModel.notify(
      info.usuarioId, req.session.user.id,
      "Permiso aprobado",
      `Tu solicitud de ${info.tipoNombre} para el ${rango} fue aprobada.`
    );
  }
  res.json({ requests: await incidenceModel.getPendingRequests() });
}

// POST /api/incidences/requests/:id/reject
async function reject(req, res) {
  const info = await incidenceModel.getRequestInfo(req.params.id);
  const result = await incidenceModel.setRequestStatus(req.params.id, incidenceModel.ESTATUS_CANCELADA);
  if (!result.ok) return res.status(409).json({ error: result.error });

  if (info) {
    const rango = info.inicio === info.fin ? info.inicio : `${info.inicio} al ${info.fin}`;
    await notificationModel.notify(
      info.usuarioId, req.session.user.id,
      "Permiso rechazado",
      `Tu solicitud de ${info.tipoNombre} para el ${rango} fue rechazada.`
    );
  }
  res.json({ requests: await incidenceModel.getPendingRequests() });
}

module.exports = { index, request, cancel, adminList, approve, reject };
