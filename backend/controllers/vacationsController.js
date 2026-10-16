const vacationModel = require("../models/vacationModel");
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
  const result = await vacationModel.createRequest(req.session.user, req.body && req.body.days);
  if (!result.ok) return res.status(400).json({ error: result.error });

  const summary = await vacationModel.getSummary(req.session.user.id, new Date().getFullYear());
  res.json({ solicitudes: result.solicitudes, summary });
}

module.exports = { index, request };
