const jugadorModel = require('../models/jugadorModel');

exports.crear = async (req, res) => {
  try {
    if (!req.body.enunciado || !req.body.enunciado.trim())
      return res.status(400).json({ error: 'enunciado requerido' });
    const r = await jugadorModel.crearPregunta(req.body);
    if (!r) return res.status(409).json({ error: 'llenas' });
    res.json(r);
  } catch (e) { console.error(e); res.status(500).json({ error: 'crear' }); }
};

exports.listar = async (req, res) => {
  try { res.json({ preguntas: await jugadorModel.listarPreguntas() }); }
  catch (e) { console.error(e); res.status(500).json({ error: 'listar' }); }
};

exports.responder = async (req, res) => {
  try {
    const { respondedorId, respuesta } = req.body;
    const ok = await jugadorModel.responder(Number(req.params.id), respondedorId, respuesta);
    if (!ok) return res.status(409).json({ error: 'no_valida' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'responder' }); }
};

exports.matchmaking = async (req, res) => {
  try {
    const p = await jugadorModel.matchmaking(Number(req.query.jugadorId));
    if (!p) return res.status(204).end();
    res.json(p);
  } catch (e) { console.error(e); res.status(500).json({ error: 'matchmaking' }); }
};