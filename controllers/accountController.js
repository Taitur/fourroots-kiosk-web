function emptyLoginModel() {
  return { username: "", password: "", rememberMe: false, error: null };
}

// GET /Account/Login
function showLogin(req, res) {
  res.render("account/login", { model: emptyLoginModel() });
}

// POST /Account/Login
function login(req, res, next) {
  const model = {
    username: req.body.Username || "",
    password: req.body.Password || "",
    rememberMe: Boolean(req.body.RememberMe),
    error: null,
  };

  if (!model.username.trim() || !model.password.trim()) {
    model.error = "Usuario y contraseña requeridos";
    return res.render("account/login", { model });
  }

  // MVP: cualquier credencial no vacía se acepta (mock).
  // Se regenera la sesión al iniciar sesión para evitar fijación de sesión.
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userName = "Ana Torres";
    req.session.userRole = "Administradora de RRHH";
    req.session.userInitials = "AT";
    res.redirect("/Dashboard/Index");
  });
}

// GET /Account/Logout
function logout(req, res) {
  req.session.destroy(() => res.redirect("/Account/Login"));
}

module.exports = { showLogin, login, logout };
