// Contenido propio del dashboard (el encabezado lo maneja js/header.js).
const escapeHtml = Portal.esc;
const icon = (name, size) => '<span class="material-symbols-outlined" style="font-size:' + size + 'px;">' + escapeHtml(name) + '</span>';
const pageUrl = (app) => (app.page ? app.page + ".html" : null);

// Tarjeta de una app en la sección del módulo (las que no tienen página se muestran apagadas).
function appCard(app) {
  const body =
    '<div class="icono"><div class="deco1"></div><div class="deco2"></div><span class="material-symbols-outlined ico">' + escapeHtml(app.icon) + '</span></div>' +
    '<div class="cuerpo"><p>' + escapeHtml(app.name) + '</p><span>' + escapeHtml(app.desc) + '</span></div>';
  const url = pageUrl(app);
  return url
    ? '<a class="app-card" style="text-decoration:none; color:inherit; cursor:pointer;" href="' + escapeHtml(url) + '">' + body + '</a>'
    : '<div class="app-card" style="opacity:.55;" title="Próximamente" data-speak="' + escapeHtml(app.name + ". " + app.desc + ". Próximamente.") + '">' + body + '</div>';
}

function renderModules(modules) {
  document.getElementById("modulesWrap").innerHTML = modules.map((m) => {
    const first = m.apps.find((a) => a.page);
    const open = first
      ? '<a class="btn-abrir" style="text-decoration:none;" href="' + escapeHtml(pageUrl(first)) + '">Abrir módulo ' + icon("arrow_forward", 15) + '</a>'
      : '<button class="btn-abrir" disabled style="opacity:.5; cursor:not-allowed;">Abrir módulo ' + icon("arrow_forward", 15) + '</button>';
    return '<div class="modulo-block">' +
      '<div class="modulo-head">' +
        '<div class="icon-box"><span class="material-symbols-outlined" style="font-size:21px; color:#fff;">' + escapeHtml(m.icon) + '</span></div>' +
        '<div class="info"><h2>' + escapeHtml(m.title) + '</h2><p>' + escapeHtml(m.description) + '</p></div>' + open +
      '</div>' +
      '<div class="apps-row">' + m.apps.map(appCard).join("") + '</div>' +
    '</div>';
  }).join("");
}

(async function init() {
  const { dashboard } = await Header.init();
  if (!dashboard) {
    document.getElementById("modulesWrap").innerHTML = '<p style="color:var(--tema-error);">No se pudo cargar el dashboard.</p>';
    return;
  }
  const { modules, employeeCount } = dashboard;
  document.getElementById("statModules").textContent = modules.length;
  document.getElementById("statApps").textContent = modules.reduce((sum, m) => sum + m.apps.length, 0);
  document.getElementById("statEmployees").textContent = employeeCount.toLocaleString("es-MX");
  renderModules(modules);
})();
