// Configuración del frontend. Edita este archivo al desplegar.
//
// API_BASE: dirección del backend, sin barra final.
//   ""                         -> mismo origen (el backend sirve este frontend, o Nginx hace proxy de /api)
//   "https://api.midominio.com" -> el API está en otro dominio (hay que configurar CORS_ORIGIN en el backend)
window.APP_CONFIG = {
  API_BASE: "",
  // GAME_URL: página del build WebGL del menú principal de juegos del Kiosco (relativa a este frontend o absoluta).
  GAME_URL: "juegos/kiosko/index.html",
};
