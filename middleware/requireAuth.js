// Redirige al login si no hay usuario en sesión.
module.exports = function requireAuth(req, res, next) {
  if (!req.session.userName) return res.redirect("/Account/Login");
  next();
};
