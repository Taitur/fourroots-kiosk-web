const express = require("express");

const requireAuth = require("../middleware/requireAuth");
const csrf = require("../middleware/csrf");

const account = require("../controllers/accountController");
const dashboard = require("../controllers/dashboardController");
const attendance = require("../controllers/attendanceController");
const avatar = require("../controllers/avatarController");
const engage = require("../controllers/engageController");
const vacations = require("../controllers/vacationsController");
const notifications = require("../controllers/notificationsController");

const router = express.Router();

// Las rutas siguen el patrón {controller}/{action}/{id?} del proyecto original.
// Express no distingue mayúsculas en las rutas por defecto (/dashboard == /Dashboard).

// ---- Cuenta ----
router.get(["/", "/Account", "/Account/Login"], csrf.provideToken, account.showLogin);
router.post("/Account/Login", csrf.verifyToken, csrf.provideToken, account.login);
router.get("/Account/Logout", account.logout);

// ---- Páginas protegidas ----
router.get(["/Dashboard", "/Dashboard/Index"], requireAuth, dashboard.index);
router.get(["/Attendance", "/Attendance/Index", "/Attendance/Index/:id"], requireAuth, attendance.index);
router.get(["/Avatar", "/Avatar/Index", "/Avatar/Index/:id"], requireAuth, avatar.index);
router.get(["/Engage", "/Engage/Index"], requireAuth, engage.index);
router.get(["/Vacations", "/Vacations/Index"], requireAuth, vacations.index);

// ---- API de notificaciones (kio_tbMensajes) ----
router.get("/api/notifications", requireAuth, notifications.list);
router.patch("/api/notifications/read-all", requireAuth, notifications.markAllRead);
router.patch("/api/notifications/:id/read", requireAuth, notifications.markRead);

module.exports = router;
