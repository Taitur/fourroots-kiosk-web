// Engage: pinta la comunidad con los datos de GET /api/engage (feed, encuestas,
// aplausos y cumpleaños), todos reales desde la BD. No hay datos de ejemplo.
(async function () {
  const { esc } = Portal;
  await Header.init();

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

  const selectedOptions = {};

  function surveyOption(survey) {
    const total = survey.votes || 0;
    const options = survey.options || [];

    if (!options.length) {
      const label = survey.voted ? "Ya votaste" : "Sí, participar";
      return `<article class="engage-rail-card">
          <h3>Encuesta</h3>
          <p>${esc(survey.question)}</p>
          <small class="engage-subtitle">Esta encuesta no tiene opciones: solo registra tu participación.</small>
          <button type="button" class="engage-survey-submit" data-survey-id="${survey.id}"${survey.voted ? " disabled" : ""}>
            <span>${esc(label)}</span><span>${total} voto${total === 1 ? "" : "s"}</span>
          </button>
        </article>`;
    }

    if (survey.voted) {
      const chosen = options.find((opt) => opt.id === survey.votedOptionId);
      return `<article class="engage-rail-card">
          <h3>Encuesta</h3>
          <p>${esc(survey.question)}</p>
          <button type="button" class="engage-survey-submit" data-survey-id="${survey.id}" disabled>
            <span>${chosen ? "Votaste: " + esc(chosen.text) : "Ya votaste"}</span><span>${total} voto${total === 1 ? "" : "s"}</span>
          </button>
        </article>`;
    }

    const selected = selectedOptions[survey.id];

    const rows = options
      .map((opt) => {
        const isSelected = selected === opt.id;
        return `<button type="button" class="engage-survey-option${isSelected ? " is-selected" : ""}" data-survey-id="${survey.id}" data-option-id="${opt.id}">
            <span>${esc(opt.text)}</span><span>${opt.votes} voto${opt.votes === 1 ? "" : "s"}</span>
          </button>`;
      })
      .join("");

    const submitRow = `<button type="button" class="engage-survey-submit" data-survey-id="${survey.id}"${selected == null ? " disabled" : ""}>
        <span class="material-symbols-outlined">send</span><span>Enviar voto</span>
      </button>`;

    return `<article class="engage-rail-card">
        <h3>Encuesta</h3>
        <p>${esc(survey.question)}</p>
        ${rows}
        ${submitRow}
        <small class="engage-subtitle">${total} voto${total === 1 ? "" : "s"} en total</small>
      </article>`;
  }

  function handleSelect(btn) {
    if (btn.disabled) return;
    const surveyId = btn.dataset.surveyId;
    const optionId = Number(btn.dataset.optionId);
    selectedOptions[surveyId] = optionId;
    renderApp();
  }

  async function handleVote(btn) {
    if (btn.disabled) return;
    const surveyId = btn.dataset.surveyId;
    const optionId = selectedOptions[surveyId];
    const buttons = app.querySelectorAll(
      `.engage-survey-option[data-survey-id="${surveyId}"], .engage-survey-submit[data-survey-id="${surveyId}"]`
    );
    buttons.forEach((b) => (b.disabled = true));

    const body = optionId != null ? { optionId: Number(optionId) } : {};
    const res = await Portal.post(`/engage/surveys/${surveyId}/vote`, body);
    if (!res.ok) {
      buttons.forEach((b) => (b.disabled = false));
      alert((res.data && res.data.error) || "No se pudo registrar tu voto.");
      return;
    }
    delete selectedOptions[surveyId];
    model.surveys = res.data.surveys;
    renderApp();
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

  function birthdayCard(b) {
    return `<article class="engage-birthday-card">
        ${avatarTag(b.name, 58)}
        <strong>${esc(b.name)}</strong>
        <small>Hoy es su cumpleaños</small>
      </article>`;
  }

  function announcementCard(post) {
    return `<article class="engage-announcement">
        <small>${esc(post.time)}</small>
        <h2>${esc(post.title)}</h2>
        <p>${esc(post.text)}</p>
      </article>`;
  }

  function commentItem(c) {
    return `<div class="engage-comment">
        ${avatarTag(c.author, 30)}
        <div>
          <strong>${esc(c.author)}</strong><small>${esc(c.time)}</small>
          <p>${esc(c.text)}</p>
        </div>
      </div>`;
  }

  function postCard(post) {
    return `<article class="engage-post" data-post-id="${post.id}">
        <div class="engage-post-header">
          ${avatarTag(post.author, 36)}
          <div><strong>${esc(post.author)}</strong><small>${esc(post.time)}</small></div>
        </div>
        <p>${esc(post.text)}</p>
        <div class="engage-comment-list">
          ${post.comments.length ? post.comments.map(commentItem).join("") : ""}
        </div>
        <div class="engage-reply-row">
          <input type="text" class="engage-reply-input" data-post-id="${post.id}" placeholder="Escribe una respuesta..." maxlength="500" />
          <button type="button" class="engage-reply-button" data-post-id="${post.id}">Responder</button>
        </div>
      </article>`;
  }

  function composerCard() {
    return `<article class="engage-composer">
        <div class="engage-composer-row">
          <textarea class="engage-composer-textarea" id="postComposerInput" placeholder="¿Qué quieres compartir con el equipo?" maxlength="2000"></textarea>
        </div>
        <div class="engage-composer-types">
          <button type="button" class="engage-composer-submit engage-primary-button" id="postComposerSubmit" style="width:auto;">Publicar</button>
        </div>
      </article>`;
  }

  async function handleCreatePost() {
    const input = document.getElementById("postComposerInput");
    const btn = document.getElementById("postComposerSubmit");
    const texto = input.value.trim();
    if (!texto) return;

    btn.disabled = true;
    const res = await Portal.post("/engage/posts", { texto });
    btn.disabled = false;
    if (!res.ok) {
      alert((res.data && res.data.error) || "No se pudo publicar.");
      return;
    }
    model.posts = res.data.posts;
    renderApp();
  }

  async function handleAddComment(postId, input, btn) {
    const texto = input.value.trim();
    if (!texto) return;

    btn.disabled = true;
    const res = await Portal.post(`/engage/posts/${postId}/comments`, { texto });
    btn.disabled = false;
    if (!res.ok) {
      alert((res.data && res.data.error) || "No se pudo responder.");
      return;
    }
    model.posts = res.data.posts;
    renderApp();
  }

  const VIEWS = {
    home: {
      title: "Home",
      subtitle: "Comparte con el equipo y revisa los anuncios de la compañía.",
      render: () =>
        composerCard() +
        (model.posts.length ? model.posts.map(postCard).join("") : '<p class="engage-subtitle">Todavía no hay publicaciones. ¡Sé el primero en compartir algo!</p>') +
        '<h3 class="engage-section-heading">Anuncios</h3>' +
        (model.feed.length ? model.feed.map(announcementCard).join("") : '<p class="engage-subtitle">Todavía no hay anuncios.</p>'),
    },
    birthdays: {
      title: "Birthdays",
      subtitle: "Compañeros que cumplen años hoy.",
      render: () => `<div class="engage-birthday-grid">${model.birthdays.length ? model.birthdays.map(birthdayCard).join("") : '<p class="engage-subtitle">Nadie cumple años hoy.</p>'}</div>`,
    },
    surveys: {
      title: "Surveys",
      subtitle: "Encuestas vigentes de la comunidad.",
      render: () => (model.surveys.length ? model.surveys.map(surveyOption).join("") : '<p class="engage-subtitle">No hay encuestas activas.</p>'),
    },
    announcements: {
      title: "Announcements",
      subtitle: "Anuncios y noticias de la compañía.",
      render: () => (model.feed.length ? model.feed.map(announcementCard).join("") : '<p class="engage-subtitle">Todavía no hay anuncios.</p>'),
    },
  };

  let currentView = "home";

  function renderApp() {
    const view = VIEWS[currentView];
    app.innerHTML = `
<div class="engage-shell">
    <div class="engage-layout">
        <aside class="engage-sidebar">
            <nav aria-label="Engage navigation">
                <button class="engage-nav-item${currentView === "home" ? " is-active" : ""}" type="button" data-view="home"><span class="material-symbols-outlined">home</span><span>Home</span></button>
                <button class="engage-nav-item${currentView === "birthdays" ? " is-active" : ""}" type="button" data-view="birthdays"><span class="material-symbols-outlined">cake</span><span>Birthdays</span></button>
                <button class="engage-nav-item${currentView === "surveys" ? " is-active" : ""}" type="button" data-view="surveys"><span class="material-symbols-outlined">bar_chart</span><span>Surveys</span></button>
                <button class="engage-nav-item${currentView === "announcements" ? " is-active" : ""}" type="button" data-view="announcements"><span class="material-symbols-outlined">campaign</span><span>Announcements</span></button>
            </nav>
        </aside>

        <main class="engage-main">
            <a href="dashboard.html" style="display:inline-flex; align-items:center; gap:6px; color:var(--ink-dim); text-decoration:none; font-size:0.85rem; font-weight:600; margin-bottom:18px;">
              <svg class="ks-icon" viewBox="0 0 24 24" style="width:16px; height:16px;"><path d="M15 18l-6-6 6-6"/></svg>
              Volver al Dashboard
            </a>

            <h1>${esc(view.title)}</h1>
            <p class="engage-subtitle">${esc(view.subtitle)}</p>

            ${view.render()}
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

    app.querySelectorAll(".engage-nav-item").forEach((btn) =>
      btn.addEventListener("click", () => {
        currentView = btn.dataset.view;
        renderApp();
      })
    );

    app.querySelectorAll(".engage-survey-option").forEach((btn) =>
      btn.addEventListener("click", () => handleSelect(btn))
    );

    app.querySelectorAll(".engage-survey-submit").forEach((btn) =>
      btn.addEventListener("click", () => handleVote(btn))
    );

    const postComposerSubmit = document.getElementById("postComposerSubmit");
    if (postComposerSubmit) postComposerSubmit.addEventListener("click", handleCreatePost);

    app.querySelectorAll(".engage-reply-button").forEach((btn) =>
      btn.addEventListener("click", () => {
        const postId = btn.dataset.postId;
        const input = app.querySelector(`.engage-reply-input[data-post-id="${postId}"]`);
        handleAddComment(postId, input, btn);
      })
    );

    app.querySelectorAll(".engage-reply-input").forEach((input) =>
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const postId = input.dataset.postId;
        const btn = app.querySelector(`.engage-reply-button[data-post-id="${postId}"]`);
        handleAddComment(postId, input, btn);
      })
    );
  }

  renderApp();
})();
