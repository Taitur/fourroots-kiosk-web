// Cliente del API compartido por todas las páginas: window.Portal
(function () {
  const API = String((window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "").replace(/\/+$/, "") + "/api";
  let csrfToken = null;

  async function fetchCsrf() {
    const res = await fetch(API + "/auth/csrf", { credentials: "include" });
    csrfToken = (await res.json()).token;
    return csrfToken;
  }

  // Devuelve siempre { ok, status, data }; status 0 = no hubo conexión con el servidor.
  async function request(method, path, body, retried) {
    try {
      const options = { method, credentials: "include", headers: {} };
      if (body !== undefined) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }
      if (method !== "GET") options.headers["X-CSRF-Token"] = csrfToken || (await fetchCsrf());

      const res = await fetch(API + path, options);
      let data = null;
      try { data = await res.json(); } catch (e) { /* algunas respuestas no llevan cuerpo JSON */ }

      // Token vencido (p. ej. tras iniciar o cerrar sesión): se pide otro y se reintenta una vez.
      if (res.status === 403 && data && data.code === "CSRF" && !retried) {
        csrfToken = null;
        return request(method, path, body, true);
      }
      // Sesión caducada a mitad de uso.
      if (res.status === 401 && !path.startsWith("/auth/")) {
        location.replace("login.html");
        return new Promise(() => {});
      }
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { error: "No se pudo conectar con el servidor." } };
    }
  }

  // Páginas protegidas: comprueba la sesión y devuelve el usuario; si no hay sesión, va al login.
  async function requireSession() {
    const res = await request("GET", "/auth/session");
    if (!res.ok) {
      location.replace("login.html");
      return new Promise(() => {});
    }
    document.documentElement.classList.remove("auth-pending");
    return res.data.user;
  }

  async function logout() {
    await request("POST", "/auth/logout");
    csrfToken = null;
    location.replace("login.html");
  }

  const esc = (text) =>
    String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  window.Portal = {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body === undefined ? {} : body),
    patch: (path, body) => request("PATCH", path, body === undefined ? {} : body),
    del: (path, body) => request("DELETE", path, body === undefined ? {} : body),
    setCsrf: (token) => { csrfToken = token; },
    requireSession,
    logout,
    esc,
  };
})();
