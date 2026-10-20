const express = require('express');
const jugadores = require('../controllers/jugadorController');
const preguntas = require('../controllers/preguntasController');
const reset = require('../controllers/resetController');

const router = express.Router();

router.post('/jugadores/login', jugadores.login);

router.get('/preguntas/matchmaking', preguntas.matchmaking);
router.get('/preguntas', preguntas.listar);
router.post('/preguntas', preguntas.crear);
router.post('/preguntas/:id/responder', preguntas.responder);

// RESET
router.post('/reset/registrar', reset.registrarActividad);
router.get('/reset/progreso/:idusuario', reset.consultarActividades);

module.exports = router;