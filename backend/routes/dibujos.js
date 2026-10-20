const express = require('express');
const dibujos = require('../controllers/dibujosController');

const router = express.Router();

// Videojuego de dibujar y adivinar. Las usa el juego de Unity (no llevan sesión ni CSRF,
// igual que las demás rutas de juegos en routes/juegos.js).
router.get('/prompts/aleatorio', dibujos.promptAleatorio);
router.post('/dibujos', dibujos.guardar);
router.get('/dibujos/aleatorio', dibujos.aleatorio);
router.post('/dibujos/puntos-adivinar', dibujos.puntosAdivinar);
router.post('/dibujos/puntos-calificacion', dibujos.puntosCalificacion);

module.exports = router;
