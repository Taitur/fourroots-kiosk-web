const mockData = require("../models/mockDataModel");

// GET /Dashboard/Index
function index(req, res) {
  res.render("dashboard/index", {
    modules: mockData.getModules(),
    user: {
      name: req.session.userName,
      role: req.session.userRole,
      initials: req.session.userInitials,
    },
  });
}

module.exports = { index };
