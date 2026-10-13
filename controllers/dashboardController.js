const dashboardModel = require("../models/dashboardModel");

// GET /Dashboard/Index
async function index(req, res) {
  const modules = dashboardModel.getModules();
  const employeeCount = await dashboardModel.countActiveEmployees();

  res.render("dashboard/index", { modules, employeeCount });
}

module.exports = { index };
