// Encabezado compartido de todas las páginas del portal (el mismo <header> que antes
// solo vivía en dashboard.html): sesión, iniciales/avatar, notificaciones, panel de
// aplicaciones y cierre de sesión. Cada página llama a Header.init() en vez de
// Portal.requireSession() directamente.
window.Header = (function () {
  const { esc } = Portal;
  const PANELS = { bellBtn: "bellPanel", avatarBtn: "userPanel", appsBtn: "appsPanel", themeBtn: "themePanel" };

  function setPanel(btnId, open) {
    const panel = document.getElementById(PANELS[btnId]);
    const btn = document.getElementById(btnId);
    if (!panel || !btn) return;
    panel.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  }

  function closePanels(exceptBtnId) {
    Object.keys(PANELS).forEach((btnId) => { if (btnId !== exceptBtnId) setPanel(btnId, false); });
  }

  function wirePanels() {
    Object.entries(PANELS).forEach(([btnId, panelId]) => {
      const btn = document.getElementById(btnId);
      const panel = document.getElementById(panelId);
      if (!btn || !panel) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !panel.classList.contains("open");
        closePanels(btnId);
        setPanel(btnId, willOpen);
      });
    });

    ["appsPanel", "themePanel"].forEach((id) => {
      const panel = document.getElementById(id);
      if (panel) panel.addEventListener("click", (e) => e.stopPropagation());
    });

    const appsClose = document.getElementById("appsClose");
    if (appsClose) appsClose.addEventListener("click", () => closePanels());

    const userNotifItem = document.getElementById("userNotifItem");
    if (userNotifItem) {
      userNotifItem.addEventListener("click", () => {
        closePanels();
        setPanel("bellBtn", true);
      });
    }

    document.addEventListener("click", () => closePanels());
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const open = Object.keys(PANELS).find((btnId) => document.getElementById(PANELS[btnId])?.classList.contains("open"));
      if (!open) return;
      closePanels();
      document.getElementById(open).focus();
    });
  }

  // ---- Notificaciones (bandeja de kio_tbMensajes) ----
  async function loadNotifications() {
    const res = await Portal.get("/notifications");
    if (!res.ok) return;
    const items = res.data;
    const unread = items.filter((n) => !n.read);
    const badge = document.getElementById("bellBadge");
    if (badge) {
      if (unread.length) { badge.style.display = "block"; badge.textContent = unread.length; }
      else { badge.style.display = "none"; }
    }
    const unreadLabel = document.getElementById("unreadLabel");
    if (unreadLabel) unreadLabel.textContent = unread.length ? unread.length + " sin leer" : "Todo al día";

    const list = document.getElementById("notifList");
    if (list) {
      list.innerHTML = items.map((n) =>
        '<div class="notif-item ' + (n.read ? "" : "unread") + '">' +
          '<div><p>' + esc(n.title) + '</p><span class="desc">' + esc(n.desc) + '</span><br><span class="time">' + esc(n.time) + '</span></div>' +
        '</div>'
      ).join("");
    }

    const markAllRead = document.getElementById("markAllRead");
    if (markAllRead && !markAllRead.dataset.wired) {
      markAllRead.dataset.wired = "1";
      markAllRead.addEventListener("click", async (e) => {
        e.preventDefault();
        await Portal.patch("/notifications/read-all");
        loadNotifications();
      });
    }
  }

  // ---- Panel "Aplicaciones": mismos módulos que el dashboard, en lista ----
  function renderAppsPanel(modules) {
    const body = document.getElementById("appsBody");
    if (!body) return;
    const icon = (name, size) => '<span class="material-symbols-outlined" style="font-size:' + size + 'px;">' + esc(name) + '</span>';
    const pageUrl = (app) => (app.page ? app.page + ".html" : null);

    body.innerHTML = modules.map((m) => {
      const first = m.apps.find((a) => a.page);
      const items = m.apps.map((a) => {
        const inner = '<span class="apps-item-icon">' + icon(a.icon, 18) + '</span><span>' + esc(a.name) + '</span>';
        const url = pageUrl(a);
        return url
          ? '<a class="apps-item" href="' + esc(url) + '">' + inner + '</a>'
          : '<div class="apps-item is-disabled" title="Próximamente" data-speak="' + esc(a.name + ". Próximamente.") + '">' + inner + '</div>';
      }).join("");
      return '<div class="apps-group"><div class="apps-group-head">' +
        '<span class="apps-group-name">' + icon(m.icon, 16) + esc(m.title) + '</span>' +
        (first ? '<a class="apps-group-link" href="' + esc(pageUrl(first)) + '">Ver módulo</a>' : "") +
        '</div>' + items + '</div>';
    }).join("");
  }

  // ---- Avatar: dibuja la configuración guardada en el canvas del encabezado; si no
  // se puede cargar (o el usuario nunca lo ha editado), se queda con las iniciales. ----
  async function renderAvatar() {
    const canvas = document.getElementById("userAvatarCanvas");
    const initials = document.getElementById("userInitials");
    if (!canvas) return;
    try {
      const res = await Portal.get("/avatar");
      if (res.ok && res.data && res.data.currentAvatar && window.AvatarDraw) {
        window.AvatarDraw.draw(canvas, res.data.currentAvatar);
        canvas.style.display = "block";
        if (initials) initials.style.display = "none";
      }
    } catch (e) { /* se queda con las iniciales */ }
  }

  async function init() {
    const user = await Portal.requireSession();

    const initials = document.getElementById("userInitials");
    const name = document.getElementById("userName");
    const role = document.getElementById("userRole");
    if (initials) initials.textContent = user.initials;
    if (name) name.textContent = user.name;
    if (role) role.textContent = user.role;

    wirePanels();
    renderAvatar();
    loadNotifications();

    const logoutLink = document.getElementById("logoutLink");
    if (logoutLink) {
      logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        Portal.logout();
      });
    }

    const dashRes = await Portal.get("/dashboard");
    if (dashRes.ok) renderAppsPanel(dashRes.data.modules);

    return { user, dashboard: dashRes.ok ? dashRes.data : null };
  }

  return { init, renderAvatar };
})();
