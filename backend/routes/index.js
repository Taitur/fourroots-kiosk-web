const express = require("express");

const requireAuth = require("../middleware/requireAuth");
const csrf = require("../middleware/csrf");

const auth = require("../controllers/authController");
const dashboard = require("../controllers/dashboardController");
const attendance = require("../controllers/attendanceController");
const avatar = require("../controllers/avatarController");
const vacations = require("../controllers/vacationsController");
const incidences = require("../controllers/incidencesController");
const notifications = require("../controllers/notificationsController");

const router = express.Router();
const juegoRoutes = require("./juegos");   // el nombre de tu archivo nuevo, sin .js
router.use("/", juegoRoutes);

// Todas las rutas cuelgan de /api. Las que modifican datos exigen sesión y token CSRF
// (cabecera X-CSRF-Token, obtenido en GET /api/auth/csrf).

router.get("/health", (req, res) => res.json({ ok: true }));

// ---- Autenticación ----
router.get("/auth/csrf", auth.csrf);
router.get("/auth/session", auth.session);
router.post("/auth/login", csrf.verifyToken, auth.login);
router.post("/auth/logout", csrf.verifyToken, auth.logout);

// ---- Dashboard ----
router.get("/dashboard", requireAuth, dashboard.index);

// ---- Asistencia y avatar ----
router.get("/attendance{/:id}", requireAuth, attendance.index);
router.get("/avatar{/:id}", requireAuth, avatar.index);

// ---- Vacaciones ----
router.get("/vacations", requireAuth, vacations.index);
router.post("/vacations/requests", requireAuth, csrf.verifyToken, vacations.request);

// ---- Incidencias (permisos) ----
router.get("/incidences", requireAuth, incidences.index);
router.post("/incidences/requests", requireAuth, csrf.verifyToken, incidences.request);
router.post("/incidences/requests/:id/cancel", requireAuth, csrf.verifyToken, incidences.cancel);

// ---- Notificaciones (kio_tbMensajes) ----
router.get("/notifications", requireAuth, notifications.list);
router.patch("/notifications/read-all", requireAuth, csrf.verifyToken, notifications.markAllRead);
router.patch("/notifications/:id/read", requireAuth, csrf.verifyToken, notifications.markRead);

module.exports = router;
