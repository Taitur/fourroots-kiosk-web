const jugadorModel = require('../models/jugadorModel');

exports.login = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'nombre requerido' });
    const jugador = await jugadorModel.login(req.body);
    if (!jugador) return res.status(400).json({ error: 'departamento invalido' });
    res.json(jugador);
  } catch (e) { console.error(e); res.status(500).json({ error: 'login' }); }
};