(function () {
  const form = document.getElementById("loginForm");
  const usernameEl = document.getElementById("username");
  const passwordEl = document.getElementById("password");
  const rememberEl = document.getElementById("rememberMe");
  const errorEl = document.getElementById("loginError");
  const button = document.getElementById("loginBtn");

  // Mostrar / ocultar contraseña
  document.getElementById("togglePwd").addEventListener("click", () => {
    const icon = document.getElementById("pwdIcon");
    const show = passwordEl.type === "password";
    passwordEl.type = show ? "text" : "password";
    icon.textContent = show ? "visibility_off" : "visibility";
  });

  function showError(text) {
    errorEl.hidden = !text;
    errorEl.textContent = text || "";
  }

  // Si ya hay una sesión abierta, directo al dashboard.
  Portal.get("/auth/session").then((res) => {
    if (res.ok) location.replace("dashboard.html");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");

    const username = usernameEl.value.trim();
    const password = passwordEl.value;
    if (!username || !password.trim()) return showError("Usuario y contraseña requeridos");

    button.disabled = true;
    const res = await Portal.post("/auth/login", { username, password, rememberMe: rememberEl.checked });
    if (res.ok) {
      Portal.setCsrf(res.data.csrfToken); // la sesión nueva trae su propio token
      return location.replace("dashboard.html");
    }

    showError((res.data && res.data.error) || "No se pudo iniciar sesión.");
    passwordEl.value = "";
    passwordEl.focus();
    button.disabled = false;
  });
})();
