const crypto = require("crypto");

// Protección anti-CSRF: el token vive en la sesión, el cliente lo pide en GET /api/auth/csrf
// y lo manda en la cabecera X-CSRF-Token de cada petición que modifica datos.

function ensureToken(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  return req.session.csrfToken;
}

function verifyToken(req, res, next) {
  const expected = req.session.csrfToken;
  const received = req.get("X-CSRF-Token");

  const valid =
    typeof expected === "string" &&
    typeof received === "string" &&
    expected.length === received.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));

  // `code` permite al cliente pedir un token nuevo y reintentar.
  if (!valid) return res.status(403).json({ error: "Token de seguridad inválido o vencido.", code: "CSRF" });
  next();
}

module.exports = { ensureToken, verifyToken };
