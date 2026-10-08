const userModel = require("../models/userModel");
const { verifyPassword } = require("../helpers/password");

function emptyLoginModel() {
  return { username: "", password: "", rememberMe: false, error: null };
}

// GET /Account/Login
function showLogin(req, res) {
  if (req.session.user) return res.redirect("/Dashboard/Index");
  res.render("account/login", { model: emptyLoginModel() });
}

// POST /Account/Login
async function login(req, res, next) {
  const model = {
    username: (req.body.Username || "").trim(),
    password: req.body.Password || "",
    rememberMe: Boolean(req.body.RememberMe),
    error: null,
  };

  if (!model.username || !model.password.trim()) {
    model.error = "Usuario y contraseña requeridos";
    return res.render("account/login", { model });
  }

  let user;
  try {
    user = await userModel.findByUsername(model.username);
  } catch (err) {
    console.error("Error al consultar el usuario:", err.message);
    model.error = "No se pudo conectar con la base de datos. Intenta de nuevo.";
    return res.render("account/login", { model });
  }

  if (!user || !user.active || !verifyPassword(model.password, user.passwordHash)) {
    model.error = "Usuario o contraseña incorrectos";
    return res.render("account/login", { model });
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
    if (model.rememberMe) req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    res.redirect("/Dashboard/Index");
  });
}

// GET /Account/Logout
function logout(req, res) {
  req.session.destroy(() => res.redirect("/Account/Login"));
}

module.exports = { showLogin, login, logout };
