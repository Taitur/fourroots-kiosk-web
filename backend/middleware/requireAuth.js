// Exige sesión iniciada; si no, responde 401 en JSON.
module.exports = function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "No autenticado" });
  next();
};
