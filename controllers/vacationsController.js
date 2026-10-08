const vacationModel = require("../models/vacationModel");

// GET /Vacations/Index
async function index(req, res) {
  const summary = await vacationModel.getSummary(req.session.user.id, new Date().getFullYear());
  res.render("vacations/index", { title: "Vacaciones", summary });
}

module.exports = { index };
