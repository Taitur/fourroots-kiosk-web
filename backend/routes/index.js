const express = require("express");

const requireAuth = require("../middleware/requireAuth");
const requireAdmin = require("../middleware/requireAdmin");
const csrf = require("../middleware/csrf");

const auth = require("../controllers/authController");
const dashboard = require("../controllers/dashboardController");
const attendance = require("../controllers/attendanceController");
const avatar = require("../controllers/avatarController");
const vacations = require("../controllers/vacationsController");
const incidences = require("../controllers/incidencesController");
const notifications = require("../controllers/notificationsController");
const engage = require("../controllers/engageController");
const users = require("../controllers/userController");

const router = express.Router();
const juegoRoutes = require("./juegos");   // el nombre de tu archivo nuevo, sin .js
router.use("/", juegoRoutes);

const dibujoRoutes = require("./dibujos");
router.use("/", dibujoRoutes);

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
router.get("/attendance", requireAuth, attendance.index);
// Solo Administrador: ver la ficha de cualquier colaborador (GET /attendance?employee=ID) y editar sus registros.
router.get("/attendance/employees", requireAuth, requireAdmin, attendance.employees);
router.get("/attendance/records", requireAuth, requireAdmin, attendance.records);
router.patch("/attendance/records", requireAuth, requireAdmin, csrf.verifyToken, attendance.saveRecord);
router.delete("/attendance/records", requireAuth, requireAdmin, csrf.verifyToken, attendance.removeRecord);
router.patch("/attendance/promotions", requireAuth, requireAdmin, csrf.verifyToken, attendance.savePromotion);
router.get("/avatar{/:id}", requireAuth, avatar.index);

// ---- Engage (comunidad) ----
router.get("/engage", requireAuth, engage.index);
router.post("/engage/news", requireAuth, csrf.verifyToken, engage.createNews);
router.patch("/engage/news/:id", requireAuth, csrf.verifyToken, engage.updateNews);
router.delete("/engage/news/:id", requireAuth, csrf.verifyToken, engage.deleteNews);
router.post("/engage/surveys/:id/vote", requireAuth, csrf.verifyToken, engage.vote);
router.post("/engage/kudos", requireAuth, csrf.verifyToken, engage.giveKudos);
router.delete("/engage/kudos/:id", requireAuth, csrf.verifyToken, engage.deleteKudos);

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

// ---- Usuarios (alta, baja y cambios) — solo Administrador ----
router.get("/users", requireAuth, requireAdmin, users.list);
router.post("/users", requireAuth, requireAdmin, csrf.verifyToken, users.create);
router.patch("/users/:id", requireAuth, requireAdmin, csrf.verifyToken, users.update);
router.delete("/users/:id", requireAuth, requireAdmin, csrf.verifyToken, users.remove);

module.exports = router;
