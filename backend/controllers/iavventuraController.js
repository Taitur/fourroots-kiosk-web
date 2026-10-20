const iavventuraModel = require('../models/iavventuraModel');

// GET /api/iavventura/preguntas?categoria=Uso práctico
// Regresa las preguntas de una categoria
exports.preguntas = async (req, res) => {
  try {
    const categoria = req.query.categoria;

    // Si no mandaron categoria, regresa error
    if (!categoria) {
      return res.status(400).json({ error: 'Falta la categoria' });
    }

    const preguntas = await iavventuraModel.preguntasPorCategoria(categoria);
    res.json({ preguntas: preguntas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al traer las preguntas' });
  }
};

