// Avatar de un colaborador: catálogos de opciones del editor (cabello, rostro,
// ropa, accesorios y colores) y persistencia en kio_tbAvatarUsuario.
const { sql, getConnection } = require("../db");

const HAIR_STYLES = [
  { key: "none", label: "Ninguno", iconSvg: "<path d='M4 4l16 16M20 4 4 20'/>" },
  { key: "short", label: "Corto", iconSvg: "<path d='M4 10a8 8 0 0 1 16 0'/>" },
  { key: "long", label: "Largo", iconSvg: "<path d='M4 10a8 8 0 0 1 16 0v8M4 10v8'/>" },
  { key: "curly", label: "Rizado", iconSvg: "<circle cx='7' cy='9' r='2'/><circle cx='12' cy='7' r='2'/><circle cx='17' cy='9' r='2'/>" },
  { key: "buzz", label: "Rapado", iconSvg: "<path d='M4 11a8 8 0 0 1 16 0' stroke-dasharray='2 2'/>" },
  { key: "ponytail", label: "Coleta", iconSvg: "<path d='M4 10a8 8 0 0 1 16 0'/><path d='M20 10c2 1 2 5 0 7'/>" },
];
const FACE_STYLES = [
  { key: "neutral", label: "Neutral", iconSvg: "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><path d='M9 15h6'/>" },
  { key: "happy", label: "Sonriente", iconSvg: "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><path d='M8 14c1.2 1.4 6.8 1.4 8 0'/>" },
  { key: "serious", label: "Serio", iconSvg: "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><path d='M9 15h6' /><path d='M8 8h2M14 8h2'/>" },
  { key: "surprised", label: "Sorprendido", iconSvg: "<circle cx='9' cy='10' r='1'/><circle cx='15' cy='10' r='1'/><circle cx='12' cy='15' r='1.6'/>" },
];
const CLOTHING_STYLES = [
  { key: "tshirt", label: "Playera", iconSvg: "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/>" },
  { key: "shirt", label: "Camisa", iconSvg: "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/><path d='M10 4l2 4 2-4'/>" },
  { key: "blazer", label: "Blazer", iconSvg: "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/><path d='M10 6 8 20M14 6l2 14'/>" },
  { key: "hoodie", label: "Sudadera", iconSvg: "<path d='M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2Z'/><path d='M9 6c1.5 2 4.5 2 6 0'/>" },
];
const ACCESSORY_STYLES = [
  { key: "none", label: "Ninguno", iconSvg: "<path d='M4 4l16 16M20 4 4 20'/>" },
  { key: "glasses", label: "Lentes", iconSvg: "<circle cx='8' cy='12' r='3'/><circle cx='16' cy='12' r='3'/><path d='M11 12h2M5 12H3M21 12h-2'/>" },
  { key: "cap", label: "Gorra", iconSvg: "<path d='M4 13a8 8 0 0 1 16 0'/><path d='M4 13h18v2H4z'/>" },
  { key: "earrings", label: "Aretes", iconSvg: "<circle cx='7' cy='14' r='1.4'/><circle cx='17' cy='14' r='1.4'/><path d='M9 9a3 3 0 0 1 6 0'/>" },
];
const SKIN_TONES = ["#FFDBAC", "#F1C27D", "#E0AC69", "#C68642", "#8D5524", "#5C3A21"];
const HAIR_COLORS = ["#1B1B1B", "#2C2416", "#5B3A29", "#8B5E3C", "#C99A5B", "#8A8A8A"];
const CLOTHING_COLORS = ["#6C5CE7", "#2F7BF0", "#1FA97A", "#FF6B6B", "#C89B4A", "#12142B"];

const DEFAULT_AVATAR = {
  skinTone: SKIN_TONES[0],
  hairStyle: "short",
  hairColor: HAIR_COLORS[0],
  faceStyle: "happy",
  clothingStyle: "tshirt",
  clothingColor: CLOTHING_COLORS[0],
  accessoryStyle: "none",
};

// Valores aceptados por campo: valida lo que llega del cliente antes de guardarlo.
const CATALOG = {
  hairStyle: HAIR_STYLES.map((o) => o.key),
  faceStyle: FACE_STYLES.map((o) => o.key),
  clothingStyle: CLOTHING_STYLES.map((o) => o.key),
  accessoryStyle: ACCESSORY_STYLES.map((o) => o.key),
  skinTone: SKIN_TONES,
  hairColor: HAIR_COLORS,
  clothingColor: CLOTHING_COLORS,
};

function getCatalogs() {
  return {
    hairStyles: HAIR_STYLES,
    faceStyles: FACE_STYLES,
    clothingStyles: CLOTHING_STYLES,
    accessoryStyles: ACCESSORY_STYLES,
    skinTones: SKIN_TONES,
    hairColors: HAIR_COLORS,
    clothingColors: CLOTHING_COLORS,
  };
}

function isValidAvatar(cfg) {
  return Boolean(cfg) && Object.keys(CATALOG).every((key) => CATALOG[key].includes(cfg[key]));
}

// Avatar guardado del usuario. Si nunca lo ha editado, devuelve el avatar por defecto.
async function getAvatar(userId) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .query(`
      SELECT vcTonopiel, vcEstiloCabello, vcColorCabello, vcEstiloRostro,
             vcEstiloRopa, vcColorRopa, vcEstiloAccesorio, dtFechaModificacion
      FROM kio_tbAvatarUsuario
      WHERE iidusuario = @usuario`);

  const row = result.recordset[0];
  if (!row) return { config: DEFAULT_AVATAR, lastModified: null };

  return {
    config: {
      skinTone: row.vcTonopiel,
      hairStyle: row.vcEstiloCabello,
      hairColor: row.vcColorCabello,
      faceStyle: row.vcEstiloRostro,
      clothingStyle: row.vcEstiloRopa,
      clothingColor: row.vcColorRopa,
      accessoryStyle: row.vcEstiloAccesorio,
    },
    lastModified: row.dtFechaModificacion,
  };
}

// Guarda (alta o cambio) el avatar del usuario. kio_tbAvatarUsuario tiene una fila
// por usuario (UQ_kio_tbAvatarUsuario_Usuario), de ahí el MERGE.
async function saveAvatar(userId, cfg) {
  if (!isValidAvatar(cfg)) return { ok: false, error: "Configuración de avatar inválida." };

  const pool = await getConnection();
  const result = await pool
    .request()
    .input("usuario", sql.Int, userId)
    .input("tono", sql.VarChar(20), cfg.skinTone)
    .input("cabello", sql.VarChar(50), cfg.hairStyle)
    .input("colorCabello", sql.VarChar(20), cfg.hairColor)
    .input("rostro", sql.VarChar(50), cfg.faceStyle)
    .input("ropa", sql.VarChar(50), cfg.clothingStyle)
    .input("colorRopa", sql.VarChar(20), cfg.clothingColor)
    .input("accesorio", sql.VarChar(50), cfg.accessoryStyle)
    .query(`
      MERGE kio_tbAvatarUsuario AS destino
      USING (SELECT @usuario AS iidusuario) AS origen
        ON destino.iidusuario = origen.iidusuario
      WHEN MATCHED THEN UPDATE SET
        vcTonopiel = @tono, vcEstiloCabello = @cabello, vcColorCabello = @colorCabello,
        vcEstiloRostro = @rostro, vcEstiloRopa = @ropa, vcColorRopa = @colorRopa,
        vcEstiloAccesorio = @accesorio, dtFechaModificacion = GETDATE()
      WHEN NOT MATCHED THEN INSERT
        (iidusuario, vcTonopiel, vcEstiloCabello, vcColorCabello, vcEstiloRostro, vcEstiloRopa, vcColorRopa, vcEstiloAccesorio)
        VALUES (@usuario, @tono, @cabello, @colorCabello, @rostro, @ropa, @colorRopa, @accesorio)
      OUTPUT inserted.dtFechaModificacion AS lastModified;`);

  return { ok: true, lastModified: result.recordset[0].lastModified };
}

module.exports = { getCatalogs, getAvatar, saveAvatar, DEFAULT_AVATAR };
