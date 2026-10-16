const path = require("path");
const express = require("express");
const session = require("express-session");
const cors = require("cors");

const routes = require("./routes");


const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error("Falta SESSION_SECRET: en producción es obligatorio para firmar las sesiones.");
}

const app = express();
app.disable("x-powered-by");

// Detrás de un proxy inverso (Nginx, balanceador...) hay que confiar en él para que la cookie
// `secure` y la IP del cliente funcionen. TRUST_PROXY=1 (nº de proxies) o "true".
if (process.env.TRUST_PROXY) {
  const v = process.env.TRUST_PROXY;
  app.set("trust proxy", v === "true" ? true : /^\d+$/.test(v) ? Number(v) : v);
}

// ---- CORS: solo si el frontend se aloja en otro origen (CORS_ORIGIN=https://app.midominio.com,...) ----
const corsOrigins = (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);
if (corsOrigins.length) {
  app.use(
    "/api",
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token"],
    })
  );
}

app.use(express.json({ limit: "100kb" }));

// ---- Sesión (en memoria, 2 h de inactividad) ----
// Entre orígenes distintos con HTTPS hay que usar COOKIE_SAMESITE=none (exige cookie secure).
const sameSite = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
const secure = sameSite === "none" ? true : process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : isProduction;

app.use(
  session({
    secret: process.env.SESSION_SECRET || "eslabon-dev-secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { httpOnly: true, secure, sameSite, maxAge: 2 * 60 * 60 * 1000 },
  })
);

// ---- API ----
app.use("/api", routes);
app.use("/api", (req, res) => res.status(404).json({ error: "Ruta no encontrada" }));



if (process.env.SERVE_FRONTEND !== "false") {
  const frontendDir = path.resolve(__dirname, process.env.FRONTEND_DIR || "../frontend");
  app.use(express.static(frontendDir, { extensions: ["html"] }));
}


app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: isProduction ? "Error interno del servidor" : err.message });
});

module.exports = app;
