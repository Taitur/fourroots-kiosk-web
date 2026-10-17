// Páginas protegidas: oculta el contenido hasta comprobar la sesión (Portal.requireSession lo muestra),
// para que no se vea un instante la página a quien no ha iniciado sesión.
(function () {
  document.documentElement.classList.add("auth-pending");
  var style = document.createElement("style");
  style.textContent = "html.auth-pending body{visibility:hidden}";
  document.head.appendChild(style);
})();
