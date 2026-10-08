const dashboardModel = require("../models/dashboardModel");

// GET /Dashboard/Index
async function index(req, res) {
  const [modules, employeeCount] = await Promise.all([
    dashboardModel.getModulesForUser(req.session.user.id),
    dashboardModel.countActiveEmployees(),
  ]);

  res.render("dashboard/index", { modules, employeeCount });
}

module.exports = { index };
