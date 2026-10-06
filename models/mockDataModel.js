// Datos en memoria (falsos) — MVP sin base de datos.
// Para conectarlo a datos reales, sustituye estas funciones por consultas a la BD / API.

const modules = [
  {
    id: "nomina",
    title: "Nómina",
    description: "Gestión de pagos y compensaciones",
    icon: "payments",
    gradient: "linear-gradient(135deg,#10B981,#0D9488)",
    apps: [
      { id: "calc", name: "Cálculo de Nómina", desc: "Proceso quincenal y mensual", icon: "calculate", url: null },
      { id: "recibos", name: "Recibos CFDI", desc: "Emisión y timbrado digital", icon: "receipt_long", url: null },
      { id: "prestamos", name: "Préstamos", desc: "Solicitudes y descuentos", icon: "account_balance", url: null },
    ],
  },
  {
    id: "capital",
    title: "Capital Humano",
    description: "Talento y desarrollo organizacional",
    icon: "groups",
    gradient: "linear-gradient(135deg,#3B82F6,#7C3AED)",
    apps: [
      { id: "reclu", name: "Reclutamiento", desc: "Proceso de contratación", icon: "person_add", url: null },
      { id: "evaluaciones", name: "Evaluaciones", desc: "Desempeño y objetivos", icon: "insights", url: null },
      { id: "capacitacion", name: "Capacitación", desc: "Cursos y certificaciones", icon: "school", url: null },
      { id: "engage", name: "Engage", desc: "Comunidad y reconocimientos", icon: "diversity_3", url: "/Engage/Index" },
    ],
  },
  {
    id: "tiempo",
    title: "Tiempo y Accesos",
    description: "Asistencia y control de acceso",
    icon: "schedule",
    gradient: "linear-gradient(135deg,#F59E0B,#EA580C)",
    apps: [
      { id: "asist", name: "Asistencia", desc: "Registro y seguimiento", icon: "fact_check", url: "/Attendance/Index" },
      { id: "horar", name: "Horarios", desc: "Turnos y calendarios", icon: "calendar_month", url: null },
      { id: "vacaciones", name: "Vacaciones", desc: "Solicitudes y saldo", icon: "beach_access", url: "/Vacations/Index" },
    ],
  },
];

const notifications = [
  { id: "n1", title: "Recibo de nómina disponible", desc: "Quincena 1 - Septiembre", time: "Hace 2 h", read: false, moduleId: "nomina" },
  { id: "n2", title: "Nueva vacante por aprobar", desc: "Analista de Capital Humano", time: "Hace 5 h", read: false, moduleId: "capital" },
  { id: "n3", title: "Solicitud de vacaciones aprobada", desc: "12 - 16 de septiembre", time: "Ayer", read: false, moduleId: "tiempo" },
  { id: "n4", title: "Checada olvidada", desc: "Registra tu entrada del día 5", time: "Hace 2 días", read: true, moduleId: "tiempo" },
];

function getModules() {
  return modules;
}

function getNotifications() {
  return notifications;
}

// Devuelve true si la notificación existía y se marcó como leída.
function markNotificationRead(id) {
  const n = notifications.find((x) => x.id === id);
  if (!n) return false;
  n.read = true;
  return true;
}

function markAllNotificationsRead() {
  notifications.forEach((n) => {
    n.read = true;
  });
}

module.exports = {
  getModules,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
