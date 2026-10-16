const avatarModel = require("../models/avatarModel");

// Avatar guardado del colaborador y catálogos del editor.
// GET /api/avatar  ·  GET /api/avatar/EMP-4821
function index(req, res) {
  res.json(avatarModel.getProfile(req.params.id || "EMP-0001"));
}

module.exports = { index };
