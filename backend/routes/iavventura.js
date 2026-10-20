const express = require('express');
const iavventura = require('../controllers/iavventuraController');

const router = express.Router();

// Videojuego IAvventura. Las usa el juego de Unity (no llevan sesión ni CSRF)

router.get('/iavventura/preguntas', iavventura.preguntas);


module.exports = router;
