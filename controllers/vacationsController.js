// GET /Vacations/Index
function index(req, res) {
  res.render("vacations/index", { title: "Vacaciones" });
}

module.exports = { index };
