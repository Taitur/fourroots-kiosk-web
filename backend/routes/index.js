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

const iavventuraRoutes = require("./iavventura");
router.use("/", iavventuraRoutes);

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
router.get("/avatar", requireAuth, avatar.index);
router.patch("/avatar", requireAuth, csrf.verifyToken, avatar.save);

// ---- Engage (comunidad) ----
router.get("/engage", requireAuth, engage.index);
router.post("/engage/surveys/:id/vote", requireAuth, csrf.verifyToken, engage.vote);
router.post("/engage/posts", requireAuth, csrf.verifyToken, engage.createPost);
router.post("/engage/posts/:id/comments", requireAuth, csrf.verifyToken, engage.addComment);
router.post("/engage/announcements", requireAuth, requireAdmin, csrf.verifyToken, engage.createAnnouncement);
router.patch("/engage/announcements/:id", requireAuth, csrf.verifyToken, engage.updateAnnouncement);
router.delete("/engage/announcements/:id", requireAuth, csrf.verifyToken, engage.deleteAnnouncement);
router.post("/engage/kudos", requireAuth, csrf.verifyToken, engage.createKudos);
router.delete("/engage/kudos/:id", requireAuth, csrf.verifyToken, engage.removeKudos);
router.post("/engage/birthdays/:id/messages", requireAuth, csrf.verifyToken, engage.addBirthdayMessage);
router.post("/engage/tips", requireAuth, csrf.verifyToken, engage.createTip);
router.post("/engage/tips/:id/vote", requireAuth, csrf.verifyToken, engage.voteTip);

// ---- Vacaciones ----
router.get("/vacations", requireAuth, vacations.index);
router.post("/vacations/requests", requireAuth, csrf.verifyToken, vacations.request);

// ---- Vacaciones: administración (aprobar/rechazar) — solo Administrador ----
router.get("/vacations/requests", requireAuth, requireAdmin, vacations.adminList);
router.post("/vacations/requests/:id/approve", requireAuth, requireAdmin, csrf.verifyToken, vacations.approve);
router.post("/vacations/requests/:id/reject", requireAuth, requireAdmin, csrf.verifyToken, vacations.reject);

// ---- Incidencias (permisos) ----
router.get("/incidences", requireAuth, incidences.index);
router.post("/incidences/requests", requireAuth, csrf.verifyToken, incidences.request);
router.post("/incidences/requests/:id/cancel", requireAuth, csrf.verifyToken, incidences.cancel);

// ---- Incidencias: administración (aprobar/rechazar) — solo Administrador ----
router.get("/incidences/requests", requireAuth, requireAdmin, incidences.adminList);
router.post("/incidences/requests/:id/approve", requireAuth, requireAdmin, csrf.verifyToken, incidences.approve);
router.post("/incidences/requests/:id/reject", requireAuth, requireAdmin, csrf.verifyToken, incidences.reject);

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
