(async function () {
  const user = await Portal.requireSession();
  const $ = (id) => document.getElementById(id);
  const frame = $("gameFrame");
  const status = $("gameStatus");
  const gameUrl = (window.APP_CONFIG && window.APP_CONFIG.GAME_URL) || "juegos/kiosko/index.html";

  $("gameFull").addEventListener("click", () => {
    const el = $("gameFrameWrap");
    if (el.requestFullscreen) el.requestFullscreen();
  });

  // Al cargar el menú principal, le pasa a Unity el id del usuario del portal para guardar sus puntos.
  // Necesita que el build exista en el mismo origen y tenga un objeto "SesionPuente"
  // con el método AsignarJugador(string). El objeto debe estar en el menú principal y no destruirse al cambiar de escena, para que todos los juegos vean el id. Sin él, los juegos corren igual sin sesión.
  frame.addEventListener("load", () => {
    status.textContent = "Sesión de " + user.name;
    let intentos = 0;
    const timer = setInterval(() => {
      intentos++;
      try {
        const unity = frame.contentWindow && frame.contentWindow.unityInstance;
        if (unity) {
          unity.SendMessage("SesionPuente", "AsignarJugador", String(user.id));
          clearInterval(timer);
        }
      } catch (e) { clearInterval(timer); }
      if (intentos >= 120) clearInterval(timer);
    }, 500);
  });
  frame.src = gameUrl;
  frame.hidden = false;
})();
