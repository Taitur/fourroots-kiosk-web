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

// Los mensajes vienen de la BD: se escapan antes de insertarlos como HTML.
function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

async function loadNotifications() {
  const res = await fetch("/api/notifications");
  if (!res.ok) return;
  const items = await res.json();
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
  await fetch("/api/notifications/read-all", { method: "PATCH" });
  loadNotifications();
});

loadNotifications();
