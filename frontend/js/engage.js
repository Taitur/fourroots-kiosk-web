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
  let editingId = null; // id de la publicación que se está editando

  // Estilo de los campos de texto de los formularios.
  const INPUT_STYLE = "width:100%;padding:10px 12px;margin-bottom:8px;border:1px solid var(--border);border-radius:9px;font:inherit;font-size:13px;";

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

  // Publicación; si el usuario es su autor (o Administrador) trae botones de editar y eliminar.
  function postCard(post) {
    if (editingId === post.id) {
      return `<article class="engage-post">
        <input id="editTitle" maxlength="100" value="${esc(post.title)}" style="${INPUT_STYLE}" />
        <textarea id="editText" maxlength="2000" rows="4" style="${INPUT_STYLE}resize:vertical;">${esc(post.text)}</textarea>
        <div class="engage-post-actions">
          <button type="button" data-action="save" data-id="${post.id}">Guardar</button>
          <button type="button" data-action="cancel">Cancelar</button>
        </div>
      </article>`;
    }
    const actions = post.canEdit
      ? `<div class="engage-post-actions">
          <button type="button" data-action="edit" data-id="${post.id}">Editar</button>
          <button type="button" data-action="delete" data-id="${post.id}">Eliminar</button>
        </div>`
      : "";
    return `<article class="engage-post">
        <div class="engage-post-header">
          ${avatarTag(post.author)}
          <div><strong>${esc(post.author)}</strong><small>${esc(post.time)}</small></div>
        </div>
        <h3 style="margin-bottom:6px;font-size:14px;">${esc(post.title)}</h3>
        <p style="white-space:pre-wrap;">${esc(post.text)}</p>
        ${actions}
      </article>`;
  }

  // Si el usuario ya votó se muestran los porcentajes; si no, botones para elegir una opción.
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
        <span>
          <strong>${esc(k.name)}</strong>
          <small>De ${esc(k.giver)} · ${esc(k.time)}</small>
          ${k.message ? `<small style="color:var(--ink-dim);">“${esc(k.message)}”</small>` : ""}
        </span>
        ${k.canDelete ? `<button type="button" data-kudo="${k.id}" title="Retirar aplauso">×</button>` : ""}
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

            <div class="engage-composer">
                <input id="newsTitle" maxlength="100" placeholder="Título de tu publicación" style="${INPUT_STYLE}" />
                <textarea id="newsText" maxlength="2000" rows="3" placeholder="¿Qué quieres compartir con tu comunidad?" style="${INPUT_STYLE}resize:vertical;"></textarea>
                <button id="newsPublish" class="engage-primary-button" type="button" style="width:auto;padding:9px 18px;">Publicar</button>
                <small id="newsMsg" style="margin-left:10px;color:#C1573F;"></small>
            </div>

            <div id="engageFeed"></div>
        </main>

        <aside class="engage-right-rail">
            <div id="engageAnnouncement"></div>

            <div id="engageSurveys"></div>

            <article class="engage-rail-card">
                <h3>Reconocimientos</h3>
                <input id="kudoName" maxlength="150" placeholder="¿A quién reconoces?" style="${INPUT_STYLE}" />
                <input id="kudoMessage" maxlength="300" placeholder="Mensaje (opcional)" style="${INPUT_STYLE}" />
                <button id="kudoSend" class="engage-primary-button" type="button">Dar aplauso 👏</button>
                <small id="kudoMsg" style="color:#C1573F;"></small>
                <div id="engageKudos"></div>
            </article>

            <article class="engage-rail-card">
                <h3>Cumpleaños hoy</h3>
                ${model.birthdays.length ? model.birthdays.map(birthdayItem).join("") : '<p>Nadie cumple años hoy.</p>'}
            </article>
        </aside>
    </div>
</div>`;

  // ---- Pintado de cada sección ----
  function renderFeed() {
    document.getElementById("engageFeed").innerHTML = model.feed.length
      ? model.feed.map(postCard).join("")
      : '<p class="engage-subtitle">Todavía no hay publicaciones.</p>';
    model.announcement = model.feed[0] || null;
    document.getElementById("engageAnnouncement").innerHTML = model.announcement
      ? `<article class="engage-announcement"><small>Anuncio destacado</small><h2>${esc(model.announcement.title)}</h2></article>`
      : "";
  }
  function renderSurveys() {
    document.getElementById("engageSurveys").innerHTML = model.surveys.map(surveyOption).join("");
  }
  function renderKudos() {
    document.getElementById("engageKudos").innerHTML = model.kudos.length
      ? model.kudos.map(kudoItem).join("")
      : '<p>Todavía no hay reconocimientos registrados.</p>';
  }
  renderFeed();
  renderSurveys();
  renderKudos();

  const errorText = (r, fallback) => (r.data && r.data.error) || fallback;

  // Publicar una noticia nueva.
  document.getElementById("newsPublish").addEventListener("click", async () => {
    const title = document.getElementById("newsTitle").value.trim();
    const text = document.getElementById("newsText").value.trim();
    const msg = document.getElementById("newsMsg");
    msg.textContent = "";
    if (!title || !text) { msg.textContent = "Escribe un título y un texto."; return; }

    const r = await Portal.post("/engage/news", { title, text });
    if (!r.ok) { msg.textContent = errorText(r, "No se pudo publicar."); return; }
    document.getElementById("newsTitle").value = "";
    document.getElementById("newsText").value = "";
    model.feed = r.data.feed;
    renderFeed();
  });

  // Editar, guardar, cancelar y eliminar publicaciones.
  document.getElementById("engageFeed").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = Number(button.dataset.id);

    if (action === "edit") { editingId = id; return renderFeed(); }
    if (action === "cancel") { editingId = null; return renderFeed(); }

    if (action === "save") {
      const title = document.getElementById("editTitle").value.trim();
      const text = document.getElementById("editText").value.trim();
      if (!title || !text) return alert("El título y el texto son obligatorios.");
      const r = await Portal.patch("/engage/news/" + id, { title, text });
      if (!r.ok) return alert(errorText(r, "No se pudo guardar."));
      editingId = null;
      model.feed = r.data.feed;
      return renderFeed();
    }

    if (action === "delete") {
      if (!confirm("¿Eliminar esta publicación?")) return;
      const r = await Portal.del("/engage/news/" + id);
      if (!r.ok) return alert(errorText(r, "No se pudo eliminar."));
      model.feed = r.data.feed;
      renderFeed();
    }
  });

  // Votar: un clic en una opción envía el voto y vuelve a pintar las encuestas.
  document.getElementById("engageSurveys").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-option]");
    if (!button) return;
    const r = await Portal.post("/engage/surveys/" + button.dataset.survey + "/vote", { optionId: Number(button.dataset.option) });
    if (!r.ok) return alert(errorText(r, "No se pudo votar."));
    model.surveys = r.data.surveys;
    renderSurveys();
  });

  // Dar un aplauso.
  document.getElementById("kudoSend").addEventListener("click", async () => {
    const name = document.getElementById("kudoName").value.trim();
    const message = document.getElementById("kudoMessage").value.trim();
    const msg = document.getElementById("kudoMsg");
    msg.textContent = "";
    if (!name) { msg.textContent = "Indica a quién reconoces."; return; }

    const r = await Portal.post("/engage/kudos", { name, message });
    if (!r.ok) { msg.textContent = errorText(r, "No se pudo enviar."); return; }
    document.getElementById("kudoName").value = "";
    document.getElementById("kudoMessage").value = "";
    model.kudos = r.data.kudos;
    renderKudos();
  });

  // Retirar un aplauso (solo quien lo dio o un Administrador ve el botón ×).
  document.getElementById("engageKudos").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-kudo]");
    if (!button) return;
    if (!confirm("¿Retirar este aplauso?")) return;
    const r = await Portal.del("/engage/kudos/" + button.dataset.kudo);
    if (!r.ok) return alert(errorText(r, "No se pudo retirar."));
    model.kudos = r.data.kudos;
    renderKudos();
  });
})();
