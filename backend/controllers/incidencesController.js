const incidenceModel = require("../models/incidenceModel");
const { INCIDENCE_TYPES } = require("../helpers/incidenceTypes");
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
  const result = await incidenceModel.createRequest(req.session.user, req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });

  res.json({ requests: await incidenceModel.getRequests(req.session.user.id) });
}

// POST /api/incidences/requests/:id/cancel
async function cancel(req, res) {
  const result = await incidenceModel.cancelRequest(req.session.user.id, req.params.id);
  if (!result.ok) return res.status(result.status).json({ error: result.error });

  res.json({ requests: await incidenceModel.getRequests(req.session.user.id) });
}

module.exports = { index, request, cancel };
