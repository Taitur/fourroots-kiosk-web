// Tipos de incidencia (permisos) que se pueden solicitar.
// La BD no tiene catálogo de eventos (kio_tbKardexEventos está vacía), así que se definen aquí;
// `id` se guarda en kio_tbAvisosMultiples.id_evento.
//
// mode "hours": un solo día con hora de inicio y fin (retardos, citas...).
// mode "days":  uno o varios días completos (incapacidades, permisos...).
const INCIDENCE_TYPES = [
  { id: 1, key: "enfermedad", label: "Enfermedad", hint: "Incapacidad o malestar", mode: "days", icon: "<path d='M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z'/>" },
  { id: 2, key: "cita-medica", label: "Cita médica", hint: "Consulta o estudios", mode: "hours", icon: "<rect x='4' y='4' width='16' height='16' rx='3'/><path d='M12 8v8M8 12h8'/>" },
  { id: 3, key: "llegada-tarde", label: "Llegada tardía", hint: "Entrarás más tarde", mode: "hours", icon: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 3'/>" },
  { id: 4, key: "salida-anticipada", label: "Salida anticipada", hint: "Saldrás antes de tu hora", mode: "hours", icon: "<path d='M9 4H5v16h4M16 8l4 4-4 4M20 12H9'/>" },
  { id: 5, key: "personal", label: "Permiso personal", hint: "Trámites o asuntos propios", mode: "days", icon: "<circle cx='12' cy='8' r='4'/><path d='M4 20c1.6-4.2 4.8-6 8-6s6.4 1.8 8 6'/>" },
  { id: 6, key: "familiar", label: "Asunto familiar", hint: "Emergencia o evento familiar", mode: "days", icon: "<circle cx='9' cy='8' r='3'/><circle cx='17' cy='9' r='2.5'/><path d='M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5M16 14.5c2.4 0 4.2 1.5 5 4.5'/>" },
  { id: 7, key: "falta-justificada", label: "Falta justificada", hint: "Ausencia con justificante", mode: "days", icon: "<circle cx='12' cy='12' r='9'/><path d='M8 12.5l3 3 5-6'/>" },
  { id: 8, key: "otro", label: "Otro", hint: "Cualquier otro permiso", mode: "days", icon: "<circle cx='6' cy='12' r='1.2'/><circle cx='12' cy='12' r='1.2'/><circle cx='18' cy='12' r='1.2'/>", commentRequired: true },
];

const getType = (id) => INCIDENCE_TYPES.find((t) => t.id === Number(id));

module.exports = { INCIDENCE_TYPES, getType };
