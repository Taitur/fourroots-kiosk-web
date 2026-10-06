const attendanceModel = require("../models/attendanceModel");

// Ficha de asistencia de Recursos Humanos: faltas, puntualidad, horas extra y ascensos.
// GET /Attendance  ·  GET /Attendance/Index/EMP-4821
function index(req, res) {
  const model = attendanceModel.getEmployeeSheet(req.params.id || "EMP-4821");
  const firstMetric = model.metrics[0];

  // Mapa que consume el selector de la gráfica en el cliente.
  const chartData = Object.fromEntries(
    model.metrics.map((m) => [m.key, { values: m.values, color: m.color, unit: m.unit, name: m.chartTitle }])
  );

  res.render("attendance/index", {
    title: `Ficha de Asistencia · ${model.employee.name}`,
    model,
    firstMetric,
    chartData,
  });
}

module.exports = { index };
