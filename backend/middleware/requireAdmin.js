// Exige que el usuario en sesión tenga rol Administrador; si no, responde 403 en JSON.
// Debe usarse después de requireAuth (necesita req.session.user ya cargado).
module.exports = function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "Administrador") {
    return res.status(403).json({ error: "Solo un administrador puede realizar esta acción." });
  }
  next();
};
