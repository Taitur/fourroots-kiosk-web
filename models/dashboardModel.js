const { getConnection } = require("../db");

// Secciones del dashboard. Sólo las apps con `url` (módulos ya implementados) son accesibles;
// el resto se muestran deshabilitadas hasta que exista su página.
const MODULES = [
  {
    id: "nomina",
    title: "Nómina",
    description: "Gestión de pagos y compensaciones",
    icon: "payments",
    apps: [
      { id: "calc", name: "Cálculo de Nómina", desc: "Proceso quincenal y mensual", icon: "calculate", url: null },
      { id: "recibos", name: "Recibos CFDI", desc: "Emisión y timbrado digital", icon: "receipt_long", url: null },
      { id: "liquidaciones", name: "Liquidaciones", desc: "Finiquitos y liquidaciones", icon: "work", url: null },
      { id: "percepciones", name: "Percepciones", desc: "Conceptos y deducciones", icon: "layers", url: null },
      { id: "imss", name: "IMSS / INFONAVIT", desc: "Movimientos y cuotas", icon: "verified", url: null },
    ],
  },
  {
    id: "capital",
    title: "Capital Humano",
    description: "Talento y desarrollo organizacional",
    icon: "groups",
    apps: [
      { id: "kiosco", name: "Kiosco", desc: "Portal de autoservicio", icon: "grid_view", url: null },
      { id: "reclutamiento", name: "Reclutamiento", desc: "Proceso de contratación", icon: "person_add", url: null },
      { id: "evaluaciones", name: "Evaluaciones", desc: "Desempeño 360°", icon: "star", url: null },
      { id: "capacitacion", name: "Capacitación", desc: "Formación y e-learning", icon: "menu_book", url: null },
      { id: "organigrama", name: "Organigrama", desc: "Estructura organizacional", icon: "account_tree", url: null },
      { id: "engage", name: "Engage", desc: "Comunidad y reconocimientos", icon: "diversity_3", url: "/Engage/Index" },
    ],
  },
  {
    id: "tiempo",
    title: "Tiempo y Accesos",
    description: "Asistencia y control de acceso",
    icon: "schedule",
    apps: [
      { id: "asistencia", name: "Asistencia", desc: "Registro y seguimiento", icon: "fact_check", url: "/Attendance/Index" },
      { id: "horarios", name: "Horarios", desc: "Turnos y calendarios", icon: "calendar_month", url: null },
      { id: "vacaciones", name: "Vacaciones", desc: "Solicitudes y saldo", icon: "beach_access", url: "/Vacations/Index" },
      { id: "incidencias", name: "Incidencias", desc: "Permisos y justificaciones", icon: "event_busy", url: "/Incidences/Index" },
      { id: "control-acceso", name: "Control de acceso", desc: "Entradas y salidas", icon: "badge", url: null },
    ],
  },
];

function getModules() {
  return MODULES;
}

// Empleados dados de alta (sin fecha de baja).
async function countActiveEmployees() {
  const pool = await getConnection();
  const result = await pool.request().query("SELECT COUNT(*) AS total FROM empleados WHERE fecha_baja IS NULL");
  return result.recordset[0].total;
}

module.exports = { getModules, countActiveEmployees };
