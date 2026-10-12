// GET /Engage/Index
function index(req, res) {
  res.render("engage/index", { title: "Engage" });
}

module.exports = { index };
