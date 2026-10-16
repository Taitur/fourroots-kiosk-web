const dashboardModel = require("../models/dashboardModel");

// GET /api/dashboard
async function index(req, res) {
  const modules = dashboardModel.getModules(req.session.user.role === "Administrador");
  const employeeCount = await dashboardModel.countActiveEmployees();
  res.json({ modules, employeeCount });
}

module.exports = { index };
