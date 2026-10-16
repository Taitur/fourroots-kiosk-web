const { getConnection } = require("../db");

// Secciones del dashboard. Sólo las apps con `page` (módulos ya implementados) son accesibles;
// el resto se muestran deshabilitadas hasta que exista su página. `page` es el nombre de la
// página del frontend (p. ej. "vacations" -> vacations.html), no una URL.
const MODULES = [
  {
    id: "nomina",
    title: "Nómina",
    description: "Gestión de pagos y compensaciones",
    icon: "payments",
    apps: [
      { id: "calc", name: "Cálculo de Nómina", desc: "Proceso quincenal y mensual", icon: "calculate", page: null },
      { id: "recibos", name: "Recibos CFDI", desc: "Emisión y timbrado digital", icon: "receipt_long", page: null },
      { id: "liquidaciones", name: "Liquidaciones", desc: "Finiquitos y liquidaciones", icon: "work", page: null },
      { id: "percepciones", name: "Percepciones", desc: "Conceptos y deducciones", icon: "layers", page: null },
      { id: "imss", name: "IMSS / INFONAVIT", desc: "Movimientos y cuotas", icon: "verified", page: null },
    ],
  },
  {
    id: "capital",
    title: "Capital Humano",
    description: "Talento y desarrollo organizacional",
    icon: "groups",
    apps: [
      { id: "kiosco", name: "Kiosco", desc: "Portal de autoservicio", icon: "grid_view", page: null },
      { id: "reclutamiento", name: "Reclutamiento", desc: "Proceso de contratación", icon: "person_add", page: null },
      { id: "evaluaciones", name: "Evaluaciones", desc: "Desempeño 360°", icon: "star", page: null },
      { id: "capacitacion", name: "Capacitación", desc: "Formación y e-learning", icon: "menu_book", page: null },
      { id: "organigrama", name: "Organigrama", desc: "Estructura organizacional", icon: "account_tree", page: null },
      { id: "engage", name: "Engage", desc: "Comunidad y reconocimientos", icon: "diversity_3", page: "engage" },
    ],
  },
  {
    id: "tiempo",
    title: "Tiempo y Accesos",
    description: "Asistencia y control de acceso",
    icon: "schedule",
    apps: [
      { id: "asistencia", name: "Asistencia", desc: "Registro y seguimiento", icon: "fact_check", page: "attendance" },
      { id: "horarios", name: "Horarios", desc: "Turnos y calendarios", icon: "calendar_month", page: null },
      { id: "vacaciones", name: "Vacaciones", desc: "Solicitudes y saldo", icon: "beach_access", page: "vacations" },
      { id: "incidencias", name: "Incidencias", desc: "Permisos y justificaciones", icon: "event_busy", page: "incidences" },
      { id: "control-acceso", name: "Control de acceso", desc: "Entradas y salidas", icon: "badge", page: null },
    ],
  },
];

// La administración de usuarios solo se agrega al menú si el usuario en sesión es Administrador.
function getModules(isAdmin) {
  if (!isAdmin) return MODULES;
  return [
    ...MODULES,
    {
      id: "administracion",
      title: "Administración",
      description: "Gestión de accesos al portal",
      icon: "admin_panel_settings",
      apps: [
        { id: "usuarios", name: "Usuarios", desc: "Alta, baja y cambios de usuarios", icon: "manage_accounts", page: "users" },
      ],
    },
  ];
}

// Empleados dados de alta (sin fecha de baja).
async function countActiveEmployees() {
  const pool = await getConnection();
  const result = await pool.request().query("SELECT COUNT(*) AS total FROM empleados WHERE fecha_baja IS NULL");
  return result.recordset[0].total;
}

module.exports = { getModules, countActiveEmployees };
