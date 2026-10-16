const attendanceModel = require("../models/attendanceModel");

// Ficha de asistencia de Recursos Humanos: faltas, puntualidad, horas extra y ascensos.
// GET /api/attendance  ·  GET /api/attendance/EMP-4821
function index(req, res) {
  res.json(attendanceModel.getEmployeeSheet(req.params.id || "EMP-4821"));
}

module.exports = { index };
