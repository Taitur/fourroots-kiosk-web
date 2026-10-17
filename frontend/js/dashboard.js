// Paneles desplegables del encabezado: botón -> panel. Solo uno abierto a la vez.
const PANELS = { bellBtn: "bellPanel", avatarBtn: "userPanel", appsBtn: "appsPanel", themeBtn: "themePanel" };

function setPanel(btnId, open) {
  document.getElementById(PANELS[btnId]).classList.toggle("open", open);
  document.getElementById(btnId).setAttribute("aria-expanded", String(open));
}

function closePanels(exceptBtnId) {
  Object.keys(PANELS).forEach((btnId) => { if (btnId !== exceptBtnId) setPanel(btnId, false); });
}

Object.entries(PANELS).forEach(([btnId, panelId]) => {
  document.getElementById(btnId).addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !document.getElementById(panelId).classList.contains("open");
    closePanels(btnId);
    setPanel(btnId, willOpen);
  });
});

// Dentro de los paneles de apps y de colores se puede hacer clic sin que se cierren.
["appsPanel", "themePanel"].forEach((id) =>
  document.getElementById(id).addEventListener("click", (e) => e.stopPropagation())
);
document.getElementById("appsClose").addEventListener("click", () => closePanels());

document.getElementById("userNotifItem").addEventListener("click", () => {
  closePanels();
  setPanel("bellBtn", true);
});
document.addEventListener("click", () => closePanels());
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const open = Object.keys(PANELS).find((btnId) => document.getElementById(PANELS[btnId]).classList.contains("open"));
  if (!open) return;
  closePanels();
  document.getElementById(open).focus();
});

// ---- Notificaciones (bandeja de kio_tbMensajes) ----
// Los mensajes vienen de la BD: se escapan antes de insertarlos como HTML.
const escapeHtml = Portal.esc;

async function loadNotifications() {
  const res = await Portal.get("/notifications");
  if (!res.ok) return;
  const items = res.data;
  const unread = items.filter((n) => !n.read);
  const badge = document.getElementById("bellBadge");
  if (unread.length) { badge.style.display = "block"; badge.textContent = unread.length; }
  else { badge.style.display = "none"; }
  document.getElementById("unreadLabel").textContent = unread.length ? unread.length + " sin leer" : "Todo al día";

  const list = document.getElementById("notifList");
  list.innerHTML = items.map((n) =>
    '<div class="notif-item ' + (n.read ? "" : "unread") + '">' +
      '<div><p>' + escapeHtml(n.title) + '</p><span class="desc">' + escapeHtml(n.desc) + '</span><br><span class="time">' + escapeHtml(n.time) + '</span></div>' +
    '</div>'
  ).join("");
}

document.getElementById("markAllRead").addEventListener("click", async (e) => {
  e.preventDefault();
  await Portal.patch("/notifications/read-all");
  loadNotifications();
});

document.getElementById("logoutLink").addEventListener("click", (e) => {
  e.preventDefault();
  Portal.logout();
});

// ---- Contenido que viene del API ----
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

// Panel "Aplicaciones" del encabezado: lo mismo, en lista.
function renderAppsPanel(modules) {
  document.getElementById("appsBody").innerHTML = modules.map((m) => {
    const first = m.apps.find((a) => a.page);
    const items = m.apps.map((a) => {
      const inner = '<span class="apps-item-icon">' + icon(a.icon, 18) + '</span><span>' + escapeHtml(a.name) + '</span>';
      const url = pageUrl(a);
      return url
        ? '<a class="apps-item" href="' + escapeHtml(url) + '">' + inner + '</a>'
        : '<div class="apps-item is-disabled" title="Próximamente" data-speak="' + escapeHtml(a.name + ". Próximamente.") + '">' + inner + '</div>';
    }).join("");
    return '<div class="apps-group"><div class="apps-group-head">' +
      '<span class="apps-group-name">' + icon(m.icon, 16) + escapeHtml(m.title) + '</span>' +
      (first ? '<a class="apps-group-link" href="' + escapeHtml(pageUrl(first)) + '">Ver módulo</a>' : "") +
      '</div>' + items + '</div>';
  }).join("");
}

(async function init() {
  const user = await Portal.requireSession();
  document.getElementById("userInitials").textContent = user.initials;
  document.getElementById("userName").textContent = user.name;
  document.getElementById("userRole").textContent = user.role;

  loadNotifications();

  const res = await Portal.get("/dashboard");
  if (!res.ok) {
    document.getElementById("modulesWrap").innerHTML = '<p style="color:var(--tema-error);">' + escapeHtml((res.data && res.data.error) || "No se pudo cargar el dashboard.") + '</p>';
    return;
  }
  const { modules, employeeCount } = res.data;
  document.getElementById("statModules").textContent = modules.length;
  document.getElementById("statApps").textContent = modules.reduce((sum, m) => sum + m.apps.length, 0);
  document.getElementById("statEmployees").textContent = employeeCount.toLocaleString("es-MX");
  renderModules(modules);
  renderAppsPanel(modules);
})();
