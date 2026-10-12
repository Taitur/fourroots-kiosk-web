const avatarModel = require("../models/avatarModel");

// Página "Mi Avatar": muestra el avatar guardado del colaborador y el editor visual.
// GET /Avatar  ·  GET /Avatar/Index/EMP-4821
function index(req, res) {
  const model = avatarModel.getProfile(req.params.id || "EMP-0001");
  res.render("avatar/index", {
    title: `Mi Avatar · ${model.employeeName}`,
    model,
  });
}

module.exports = { index };
