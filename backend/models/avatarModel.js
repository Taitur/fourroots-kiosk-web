// Avatar de un colaborador y catálogos de opciones del editor
// (cabello, rostro, ropa, accesorios y colores).
// Implementación con datos de ejemplo. Cuando exista el backend real de Capital Humano,
// este modelo se sustituye por uno que consulte la API sin tocar el controlador ni la vista.

function buildSampleProfile() {
  return {
    employeeName: "María González",
    employeeRole: "Coordinadora · Capital Humano",
    statusLabel: "Activo",
    lastEditedText: "Última edición: hace 3 días",
    currentAvatar: {
      skinTone: "#F1C27D",
      hairStyle: "short",
      hairColor: "#2C2416",
      faceStyle: "happy",
      clothingStyle: "tshirt",
      clothingColor: "#6C5CE7",
      accessoryStyle: "none",
    },
    contextItems: [
      {
        title: "Mi perfil",
        description: "Encabezado de perfil público y tarjeta de contacto.",
        iconSvg: "<circle cx='12' cy='8' r='4'/><path d='M4 20c1.6-4.2 4.8-6 8-6s6.4 1.8 8 6'/>",
      },
      {
        title: "Comunidad",
        description: "Publicaciones, foros, comentarios y reacciones.",
        iconSvg: "<path d='M21 15a4 4 0 0 1-4 4H8l-5 3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z'/>",
      },
    ],
    hairStyles: [
      { key: "none", label: "Ninguno", iconSvg: "<path d='M4 4l16 16M20 4 4 20'/>" },
      { key: "short", label: "Corto", iconSvg: "<path d='M4 10a8 8 0 0 1 16 0'/>" },
      { key: "long", label: "Largo", iconSvg: "<path d='M4 10a8 8 0 0 1 16 0v8M4 10v8'/>" },
      { key: "curly", label: "Rizado", iconSvg: "<circle cx='7' cy='9' r='2'/><circle cx='12' cy='7' r='2'/><circle cx='17' cy='9' r='2'/>" },
      { key: "buzz", label: "Rapado", iconSvg: "<path d='M4 11a8 8 0 0 1 16 0' stroke-dasharray='2 2'/>" },
      { key: "ponytail", label: "Coleta", iconSvg: "<path d='M4 10a8 8 0 0 1 16 0'/><path d='M20 10c2 1 2 5 0 7'/>" },
    ],
    faceStyles: [
      { key: "neutral", label: "Neutral", iconSvg: "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><path d='M9 15h6'/>" },
      { key: "happy", label: "Sonriente", iconSvg: "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><path d='M8 14c1.2 1.4 6.8 1.4 8 0'/>" },
      { key: "serious", label: "Serio", iconSvg: "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><path d='M9 15h6' /><path d='M8 8h2M14 8h2'/>" },
      { key: "surprised", label: "Sorprendido", iconSvg: "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><circle cx='12' cy='15' r='1.6'/>" },
    ],
    clothingStyles: [
      { key: "tshirt", label: "Playera", iconSvg: "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/>" },
      { key: "shirt", label: "Camisa", iconSvg: "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/><path d='M10 4l2 4 2-4'/>" },
      { key: "blazer", label: "Blazer", iconSvg: "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/><path d='M10 6 8 20M14 6l2 14'/>" },
      { key: "hoodie", label: "Sudadera", iconSvg: "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/><path d='M9 6c1.5 2 4.5 2 6 0'/>" },
    ],
    accessoryStyles: [
      { key: "none", label: "Ninguno", iconSvg: "<path d='M4 4l16 16M20 4 4 20'/>" },
      { key: "glasses", label: "Lentes", iconSvg: "<circle cx='8' cy='12' r='3'/><circle cx='16' cy='12' r='3'/><path d='M11 12h2M5 12H3M21 12h-2'/>" },
      { key: "cap", label: "Gorra", iconSvg: "<path d='M4 13a8 8 0 0 1 16 0'/><path d='M4 13h18v2H4z'/>" },
      { key: "earrings", label: "Aretes", iconSvg: "<circle cx='7' cy='14' r='1.4'/><circle cx='17' cy='14' r='1.4'/><path d='M9 9a3 3 0 0 1 6 0'/>" },
    ],
    skinTones: ["#FFDBAC", "#F1C27D", "#E0AC69", "#C68642", "#8D5524", "#5C3A21"],
    hairColors: ["#1B1B1B", "#2C2416", "#5B3A29", "#8B5E3C", "#C99A5B", "#8A8A8A"],
    clothingColors: ["#6C5CE7", "#2F7BF0", "#1FA97A", "#FF6B6B", "#C89B4A", "#12142B"],
  };
}

// Devuelve el avatar guardado del colaborador junto con los catálogos de opciones.
// Si el id no existe, devuelve el avatar de ejemplo.
function getProfile(employeeId) {
  return buildSampleProfile();
}

module.exports = { getProfile };
