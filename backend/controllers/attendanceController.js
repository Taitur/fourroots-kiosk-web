const attendanceModel = require("../models/attendanceModel");

// Ficha de asistencia de Recursos Humanos: faltas, puntualidad, horas extra y ascensos.
// GET /api/attendance — del usuario en sesión.
async function index(req, res) {
  res.json(await attendanceModel.getEmployeeSheet(req.session.user));
}

module.exports = { index };
