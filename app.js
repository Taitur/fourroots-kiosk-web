const path = require("path");

// Debe cargarse antes que cualquier otro módulo: db.js lee process.env al importarse.
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const express = require("express");
const session = require("express-session");

const routes = require("./routes");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Vistas (EJS) — equivalente a Razor.
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serializa datos para incrustarlos dentro de un <script> sin romper el HTML.
app.locals.toScriptJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Sesión en memoria (sin base de datos), 2 h de inactividad.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "eslabon-dev-secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: 2 * 60 * 60 * 1000,
    },
  })
);

app.use(routes);

app.use((err, req, res, next) => {
  console.error(err);
  if (isProduction) return res.redirect("/Account/Login");
  next(err);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Portal Eslabon escuchando en http://localhost:${port}`);
});
