const incidenceModel = require("../models/incidenceModel");
const { INCIDENCE_TYPES } = require("../helpers/incidenceTypes");
const { toIsoDate } = require("../helpers/dates");

// GET /Incidences/Index
async function index(req, res) {
  const requests = await incidenceModel.getRequests(req.session.user.id);

  res.render("incidences/index", {
    title: "Incidencias",
    // Datos que usa la página en el cliente (public/js/incidences.js).
    pageData: {
      today: toIsoDate(new Date()),
      types: INCIDENCE_TYPES,
      requests,
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
    },
  });
}

// POST /Incidences/Request   body: { type, date, endDate?, startTime?, endTime?, comment? }
async function request(req, res) {
  const result = await incidenceModel.createRequest(req.session.user, req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });

  res.json({ requests: await incidenceModel.getRequests(req.session.user.id) });
}

// POST /Incidences/Cancel/:id
async function cancel(req, res) {
  const result = await incidenceModel.cancelRequest(req.session.user.id, req.params.id);
  if (!result.ok) return res.status(result.status).json({ error: result.error });

  res.json({ requests: await incidenceModel.getRequests(req.session.user.id) });
}

module.exports = { index, request, cancel };
