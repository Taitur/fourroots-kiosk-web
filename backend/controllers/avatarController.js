const avatarModel = require("../models/avatarModel");

const CONTEXT_ITEMS = [
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
];

function formatLastEdited(date) {
  if (!date) return "Aún no has editado tu avatar";
  const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (diffDays <= 0) return "Última edición: hoy";
  if (diffDays === 1) return "Última edición: hace 1 día";
  return "Última edición: hace " + diffDays + " días";
}

// GET /api/avatar — avatar guardado del usuario de la sesión + catálogos del editor.
async function index(req, res) {
  const user = req.session.user;
  const { config, lastModified } = await avatarModel.getAvatar(user.id);

  res.json({
    employeeName: user.name,
    employeeRole: user.role,
    statusLabel: "Activo",
    lastEditedText: formatLastEdited(lastModified),
    currentAvatar: config,
    contextItems: CONTEXT_ITEMS,
    ...avatarModel.getCatalogs(),
  });
}

// PATCH /api/avatar   body: { skinTone, hairStyle, hairColor, faceStyle, clothingStyle, clothingColor, accessoryStyle }
async function save(req, res) {
  const result = await avatarModel.saveAvatar(req.session.user.id, req.body || {});
  if (!result.ok) return res.status(400).json({ error: result.error });

  res.json({ currentAvatar: req.body, lastEditedText: formatLastEdited(result.lastModified) });
}

module.exports = { index, save };
