const dibujosModel = require('../models/dibujosModel');

const MAX_PUNTOS_ADIVINAR = 1000;   // tope por si alguien manda un número exagerado
const MAX_CALIFICACION = 5;
const MAX_IMAGEN_BYTES = 4 * 1024 * 1024;   // 4 MB

// Número entero positivo o null
function idValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ¿Los bytes empiezan con la firma de un PNG?
function esPng(buf) {
  return buf.length > 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

// GET /api/prompts/aleatorio
exports.promptAleatorio = async (req, res) => {
  try {
    const p = await dibujosModel.promptAleatorio();
    if (!p) return res.status(404).json({ error: 'No hay prompts en la tabla' });
    res.json(p);
  } catch (e) { console.error(e); res.status(500).json({ error: 'prompt_aleatorio' }); }
};

// POST /api/dibujos   { id_jugador, id_prompt, img_dibujo (PNG en base64) }
exports.guardar = async (req, res) => {
  try {
    const idJugador = idValido(req.body.id_jugador);
    const idPrompt = idValido(req.body.id_prompt);
    if (!idJugador || !idPrompt) return res.status(400).json({ error: 'id_jugador e id_prompt son requeridos' });

    const b64 = req.body.img_dibujo;
    if (typeof b64 !== 'string' || !b64) return res.status(400).json({ error: 'img_dibujo requerido' });

    const png = Buffer.from(b64, 'base64');
    if (!esPng(png)) return res.status(400).json({ error: 'img_dibujo no es un PNG válido' });
    if (png.length > MAX_IMAGEN_BYTES) return res.status(413).json({ error: 'La imagen es demasiado grande' });

    const id = await dibujosModel.guardarDibujo({ idJugador, idPrompt, png });
    res.json({ id_dibujo: id });
  } catch (e) {
    console.error(e);
    // 547 = violación de llave foránea (el jugador o el prompt no existen)
    if (e.number === 547) return res.status(400).json({ error: 'El jugador o el prompt no existen' });
    res.status(500).json({ error: 'guardar_dibujo' });
  }
};

// GET /api/dibujos/aleatorio?excluir=ID
exports.aleatorio = async (req, res) => {
  try {
    const excluir = req.query.excluir === undefined ? null : idValido(req.query.excluir);
    const d = await dibujosModel.dibujoAleatorio(excluir);
    if (!d) return res.status(404).json({ error: 'No hay dibujos disponibles' });
    res.json(d);
  } catch (e) { console.error(e); res.status(500).json({ error: 'dibujo_aleatorio' }); }
};

// POST /api/dibujos/puntos-adivinar   { id_dibujo, puntos, id_jugador (quien adivinó) }
exports.puntosAdivinar = async (req, res) => {
  try {
    const idDibujo = idValido(req.body.id_dibujo);
    const idJugador = idValido(req.body.id_jugador);
    const puntos = Number(req.body.puntos);
    if (!idDibujo || !idJugador) return res.status(400).json({ error: 'id_dibujo e id_jugador son requeridos' });
    if (!Number.isInteger(puntos) || puntos < 0 || puntos > MAX_PUNTOS_ADIVINAR)
      return res.status(400).json({ error: `puntos debe ser un entero de 0 a ${MAX_PUNTOS_ADIVINAR}` });

    const r = await dibujosModel.registrarPuntos('adivinar', { idDibujo, puntos, idJugador });
    if (!r) return res.status(404).json({ error: 'No existe ese dibujo' });
    res.json(r);
  } catch (e) { console.error(e); res.status(500).json({ error: 'puntos_adivinar' }); }
};

// POST /api/dibujos/puntos-calificacion   { id_dibujo, puntos (1 a 5) }
exports.puntosCalificacion = async (req, res) => {
  try {
    const idDibujo = idValido(req.body.id_dibujo);
    const puntos = Number(req.body.puntos);
    if (!idDibujo) return res.status(400).json({ error: 'id_dibujo requerido' });
    if (!Number.isInteger(puntos) || puntos < 1 || puntos > MAX_CALIFICACION)
      return res.status(400).json({ error: `La calificación debe ser un entero de 1 a ${MAX_CALIFICACION}` });

    const r = await dibujosModel.registrarPuntos('calificacion', { idDibujo, puntos });
    if (!r) return res.status(404).json({ error: 'No existe ese dibujo' });
    res.json(r);
  } catch (e) { console.error(e); res.status(500).json({ error: 'puntos_calificacion' }); }
};
