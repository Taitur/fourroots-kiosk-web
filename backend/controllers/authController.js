const userModel = require("../models/userModel");
const { verifyPassword } = require("../helpers/password");
const { ensureToken } = require("../middleware/csrf");

// GET /api/auth/csrf
function csrf(req, res) {
  res.json({ token: ensureToken(req) });
}

// GET /api/auth/session — usuario de la sesión actual
function session(req, res) {
  if (!req.session.user) return res.status(401).json({ error: "No autenticado" });
  res.json({ user: req.session.user });
}

// POST /api/auth/login   body: { username, password, rememberMe }
async function login(req, res, next) {
  const body = req.body || {};
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password.trim()) return res.status(400).json({ error: "Usuario y contraseña requeridos" });

  let user;
  try {
    user = await userModel.findByUsername(username);
  } catch (err) {
    console.error("Error al consultar el usuario:", err.message);
    return res.status(503).json({ error: "No se pudo conectar con la base de datos. Intenta de nuevo." });
  }

  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
  }

  // Se regenera la sesión al iniciar sesión para evitar fijación de sesión.
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.user = {
      id: user.id,
      username: user.username,
      companyId: user.companyId,
      employeeId: user.employeeId,
      name: user.name,
      role: user.role,
      initials: user.initials,
    };
    // "Mantener sesión": cookie de 30 días; si no, dura lo que la sesión (2 h de inactividad).
    if (body.rememberMe) req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    // La sesión nueva tiene su propio token CSRF: se devuelve para que el cliente lo actualice.
    res.json({ user: req.session.user, csrfToken: ensureToken(req) });
  });
}

// POST /api/auth/logout
function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
}

module.exports = { csrf, session, login, logout };
