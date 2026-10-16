// Aplica el tema guardado antes de que se pinte la página (se carga en el <head>, sin defer).
(function () {
  var THEMES = ["azul", "verde", "violeta", "ambar", "deuteranopia", "protanopia", "tritanopia"];
  try {
    var saved = localStorage.getItem("eslabon-theme");
    if (THEMES.indexOf(saved) !== -1) document.documentElement.setAttribute("data-portal-theme", saved);
  } catch (e) { /* localStorage no disponible: se queda el tema Clásico */ }
})();
