// Engage: pinta la comunidad con los datos de GET /api/engage (feed, encuestas,
// aplausos y cumpleaños), todos reales desde la BD. No hay datos de ejemplo.
(async function () {
  const { esc } = Portal;
  const user = await Portal.requireSession();

  const res = await Portal.get("/engage");
  const app = document.getElementById("app");
  if (!res.ok) {
    app.innerHTML = '<p style="padding:40px;">' + esc((res.data && res.data.error) || "No se pudo cargar Engage.") + "</p>";
    return;
  }

  const model = res.data;

  // Color de avatar determinista a partir del nombre, sin depender de una lista fija.
  const AVATAR_COLORS = ["#6C5CE7", "#F0653C", "#0E9E8E", "#2F7BF0", "#F5A524", "#C1573F", "#2F6F68"];
  function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  }
  function avatarTag(name, size) {
    const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
    const style = "background:" + avatarColor(name || "") + (size ? ";width:" + size + "px;height:" + size + "px" : "");
    return '<span class="engage-avatar" style="' + style + '">' + esc(initial) + "</span>";
  }

  function postCard(post) {
    return `<article class="engage-post">
        <div class="engage-post-header">
          ${avatarTag(post.author)}
          <div><strong>${esc(post.author)}</strong><small>${esc(post.time)}</small></div>
        </div>
        <p>${esc(post.text)}</p>
      </article>`;
  }

  function surveyOption(survey) {
    return `<article class="engage-rail-card">
        <h3>Encuesta</h3>
        <p>${esc(survey.question)}</p>
        <div class="engage-survey-option">${survey.voted ? "Ya votaste" : "Pendiente de tu voto"}<span>${survey.votes} voto${survey.votes === 1 ? "" : "s"}</span></div>
      </article>`;
  }

  function kudoItem(k) {
    return `<div class="engage-mini-person">
        ${avatarTag(k.name, 32)}
        <span><strong>${esc(k.name)}</strong><small>Reconocimiento</small></span>
      </div>`;
  }

  function birthdayItem(b) {
    return `<div class="engage-mini-person">
        ${avatarTag(b.name, 32)}
        <span><strong>${esc(b.name)}</strong><small>Hoy es su cumpleaños</small></span>
      </div>`;
  }

  app.innerHTML = `
<div class="engage-shell">
    <header class="engage-topbar">
        <a class="engage-brand" href="dashboard.html">
            <span class="engage-brand-mark">E</span>
            <span>Eslabon</span>
            <small>Community</small>
        </a>

        <div class="engage-top-actions">
            <div class="engage-user-chip">
                ${avatarTag(user.name)}
                <span>
                    <strong>${esc(user.name)}</strong>
                    <small>${esc(user.role)}</small>
                </span>
            </div>
        </div>
    </header>

    <div class="engage-layout">
        <aside class="engage-sidebar">
            <nav aria-label="Engage navigation">
                <button class="engage-nav-item is-active" type="button"><span class="material-symbols-outlined">home</span><span>Home</span></button>
                <button class="engage-nav-item" type="button"><span class="material-symbols-outlined">cake</span><span>Birthdays</span></button>
                <button class="engage-nav-item" type="button"><span class="material-symbols-outlined">bar_chart</span><span>Surveys</span></button>
                <button class="engage-nav-item" type="button"><span class="material-symbols-outlined">campaign</span><span>Announcements</span></button>
            </nav>
        </aside>

        <main class="engage-main">
            <h1>Home</h1>
            <p class="engage-subtitle">Lo que está pasando en tu comunidad.</p>

            <div id="engageFeed">${model.feed.length ? model.feed.map(postCard).join("") : '<p class="engage-subtitle">Todavía no hay publicaciones.</p>'}</div>
        </main>

        <aside class="engage-right-rail">
            ${model.announcement ? `
            <article class="engage-announcement">
                <small>Anuncio destacado</small>
                <h2>${esc(model.announcement.title)}</h2>
            </article>` : ""}

            ${model.surveys.length ? model.surveys.map(surveyOption).join("") : ""}

            <article class="engage-rail-card">
                <h3>Reconocimientos</h3>
                ${model.kudos.length ? model.kudos.map(kudoItem).join("") : '<p>Todavía no hay reconocimientos registrados.</p>'}
            </article>

            <article class="engage-rail-card">
                <h3>Cumpleaños hoy</h3>
                ${model.birthdays.length ? model.birthdays.map(birthdayItem).join("") : '<p>Nadie cumple años hoy.</p>'}
            </article>
        </aside>
    </div>
</div>`;
})();
