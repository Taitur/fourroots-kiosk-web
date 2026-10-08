// Exige sesión iniciada. Las páginas redirigen al login; la API responde 401.
// El usuario queda disponible en las vistas como `currentUser`.
module.exports = function requireAuth(req, res, next) {
  const user = req.session.user;
  if (!user) {
    if (req.originalUrl.startsWith("/api/")) return res.status(401).json({ error: "No autenticado" });
    return res.redirect("/Account/Login");
  }
  res.locals.currentUser = user;
  next();
};
