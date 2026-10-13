const crypto = require("crypto");

// Protección anti-CSRF sencilla (equivalente a @Html.AntiForgeryToken / [ValidateAntiForgeryToken]).
// El token vive en la sesión y se envía en el formulario como campo oculto.

function provideToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyToken(req, res, next) {
  const expected = req.session.csrfToken;
  // Formularios lo envían como campo oculto; las peticiones fetch, en la cabecera.
  const received = (req.body && req.body._csrf) || req.get("X-CSRF-Token");

  const valid =
    typeof expected === "string" &&
    typeof received === "string" &&
    expected.length === received.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));

  if (!valid) return res.status(400).send("Solicitud inválida (token CSRF).");
  next();
}

module.exports = { provideToken, verifyToken };
