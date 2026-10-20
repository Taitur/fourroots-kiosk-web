// Engage: pinta la comunidad con los datos de GET /api/engage (feed, encuestas,
// aplausos, cumpleaños y publicaciones del Home), todos reales desde la BD.
(async function () {
  const MAX_TITULO = 100;
  const MAX_TEXTO = 2000;
  const MAX_NOMBRE = 150;
  const MAX_MENSAJE = 300;

  const { esc } = Portal;
  const { user: me } = await Header.init();
  const isAdmin = me.role === "Administrador";

  const res = await Portal.get("/engage");
  const app = document.getElementById("app");
  if (!res.ok) {
    app.innerHTML = '<p style="padding:40px;">' + esc((res.data && res.data.error) || "No se pudo cargar Engage.") + "</p>";
    return;
  }

  const model = res.data;
  const selectedOptions = {};
  let currentView = "home";
  let editingAnnouncementId = null;

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
      const chosen = options.find((opt) => opt.id === survey.myOption);
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

  function kudoItem(k) {
    return `<div class="engage-mini-person">
        ${avatarTag(k.name, 32)}
        <span>
          <strong>${esc(k.name)}</strong>
          <small>De ${esc(k.giver)} · ${esc(k.time)}</small>
          ${k.message ? `<small style="color:var(--ink-dim);">“${esc(k.message)}”</small>` : ""}
        </span>
        ${k.canDelete ? `<button type="button" class="engage-kudos-delete" data-kudos-id="${k.id}" title="Retirar">✕</button>` : ""}
      </div>`;
  }

  // Formulario para dar un aplauso a un compañero.
  function kudosComposer() {
    return `<form class="engage-kudos-form" id="kudosForm">
        <input type="text" class="engage-reply-input" id="kudosNameInput" placeholder="Nombre de tu compañero" maxlength="${MAX_NOMBRE}" />
        <input type="text" class="engage-reply-input" id="kudosMessageInput" placeholder="Mensaje (opcional)" maxlength="${MAX_MENSAJE}" style="margin-top:8px;" />
        <button type="submit" class="engage-reply-button" id="kudosSubmit" style="margin-top:8px; width:100%;">Dar un aplauso</button>
      </form>`;
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
    if (editingAnnouncementId === post.id) {
      return `<article class="engage-announcement" data-announcement-id="${post.id}">
          <input type="text" class="engage-reply-input" id="announcementEditTitle" value="${esc(post.title)}" maxlength="${MAX_TITULO}" style="color:var(--ink);" />
          <textarea class="engage-composer-textarea" id="announcementEditText" maxlength="${MAX_TEXTO}" style="margin-top:8px;">${esc(post.text)}</textarea>
          <div class="engage-composer-types">
            <button type="button" class="engage-light-button engage-announcement-save" data-announcement-id="${post.id}">Guardar</button>
            <button type="button" class="engage-light-button engage-announcement-cancel">Cancelar</button>
          </div>
        </article>`;
    }

    const actions = post.canEdit
      ? `<div class="engage-composer-types" style="margin-top:10px;">
          <button type="button" class="engage-light-button engage-announcement-edit" data-announcement-id="${post.id}">Editar</button>
          <button type="button" class="engage-light-button engage-announcement-delete" data-announcement-id="${post.id}">Eliminar</button>
        </div>`
      : "";

    return `<article class="engage-announcement">
        <small>${esc(post.time)}</small>
        <h2>${esc(post.title)}</h2>
        <p>${esc(post.text)}</p>
        ${actions}
      </article>`;
  }

  // Formulario para crear un anuncio nuevo (solo Administrador).
  function announcementComposer() {
    return `<article class="engage-composer">
        <input type="text" class="engage-reply-input" id="announcementTitleInput" placeholder="Título del anuncio" maxlength="${MAX_TITULO}" />
        <textarea class="engage-composer-textarea" id="announcementTextInput" placeholder="Escribe el anuncio..." maxlength="${MAX_TEXTO}" style="margin-top:8px;"></textarea>
        <div class="engage-composer-types">
          <button type="button" class="engage-composer-submit engage-primary-button" id="announcementSubmit" style="width:auto;">Publicar anuncio</button>
        </div>
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
      render: () =>
        (isAdmin ? announcementComposer() : "") +
        (model.feed.length ? model.feed.map(announcementCard).join("") : '<p class="engage-subtitle">Todavía no hay anuncios.</p>'),
    },
  };

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

            <h3 class="engage-section-heading">${esc(view.title)}</h3>
            <p class="engage-subtitle">${esc(view.subtitle)}</p>

            ${view.render()}
        </main>

        <aside class="engage-right-rail">
            ${model.announcement ? announcementCard(model.announcement) : ""}

            <article class="engage-rail-card">
                <h3>Reconocimientos</h3>
                ${kudosComposer()}
                ${model.kudos.length ? model.kudos.map(kudoItem).join("") : "<p>Todavía no hay reconocimientos registrados.</p>"}
            </article>

            <article class="engage-rail-card">
                <h3>Cumpleaños hoy</h3>
                ${model.birthdays.length ? model.birthdays.map(birthdayItem).join("") : "<p>Nadie cumple años hoy.</p>"}
            </article>
        </aside>
    </div>
</div>`;
  }

  renderApp();

  const errorText = (r, fallback) => (r.data && r.data.error) || fallback;

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

    const body = optionId != null ? { optionId: Number(optionId) } : {};
    const r = await Portal.post(`/engage/surveys/${surveyId}/vote`, body);
    if (!r.ok) {
      alert(errorText(r, "No se pudo registrar tu voto."));
      return;
    }
    delete selectedOptions[surveyId];
    model.surveys = r.data.surveys;
    renderApp();
  }

  async function handleCreatePost() {
    const input = document.getElementById("postComposerInput");
    const texto = input.value.trim();
    if (!texto) return;

    const r = await Portal.post("/engage/posts", { texto });
    if (!r.ok) {
      alert(errorText(r, "No se pudo publicar."));
      return;
    }
    model.posts = r.data.posts;
    renderApp();
  }

  async function handleAddComment(postId, input) {
    const texto = input.value.trim();
    if (!texto) return;

    const r = await Portal.post(`/engage/posts/${postId}/comments`, { texto });
    if (!r.ok) {
      alert(errorText(r, "No se pudo responder."));
      return;
    }
    model.posts = r.data.posts;
    renderApp();
  }

  async function handleCreateAnnouncement() {
    const titleInput = document.getElementById("announcementTitleInput");
    const textInput = document.getElementById("announcementTextInput");
    const title = titleInput.value.trim();
    const text = textInput.value.trim();
    if (!title || !text) return;

    const r = await Portal.post("/engage/announcements", { title, text });
    if (!r.ok) {
      alert(errorText(r, "No se pudo publicar el anuncio."));
      return;
    }
    model.feed = r.data.feed;
    model.announcement = model.feed[0] || null;
    renderApp();
  }

  async function handleSaveAnnouncement(newsId) {
    const titleInput = document.getElementById("announcementEditTitle");
    const textInput = document.getElementById("announcementEditText");
    const title = titleInput.value.trim();
    const text = textInput.value.trim();
    if (!title || !text) return;

    const r = await Portal.patch(`/engage/announcements/${newsId}`, { title, text });
    if (!r.ok) {
      alert(errorText(r, "No se pudo editar el anuncio."));
      return;
    }
    model.feed = r.data.feed;
    model.announcement = model.feed[0] || null;
    editingAnnouncementId = null;
    renderApp();
  }

  async function handleDeleteAnnouncement(newsId) {
    if (!confirm("¿Eliminar este anuncio?")) return;

    const r = await Portal.del(`/engage/announcements/${newsId}`);
    if (!r.ok) {
      alert(errorText(r, "No se pudo eliminar el anuncio."));
      return;
    }
    model.feed = r.data.feed;
    model.announcement = model.feed[0] || null;
    renderApp();
  }

  async function handleGiveKudos() {
    const nameInput = document.getElementById("kudosNameInput");
    const messageInput = document.getElementById("kudosMessageInput");
    const name = nameInput.value.trim();
    const message = messageInput.value.trim();
    if (!name) return;

    const r = await Portal.post("/engage/kudos", { name, message });
    if (!r.ok) {
      alert(errorText(r, "No se pudo registrar el aplauso."));
      return;
    }
    model.kudos = r.data.kudos;
    renderApp();
  }

  async function handleDeleteKudos(kudosId) {
    if (!confirm("¿Retirar este reconocimiento?")) return;

    const r = await Portal.del(`/engage/kudos/${kudosId}`);
    if (!r.ok) {
      alert(errorText(r, "No se pudo retirar el reconocimiento."));
      return;
    }
    model.kudos = r.data.kudos;
    renderApp();
  }

  // Delegación de eventos sobre #app: sobrevive a los re-renders completos de renderApp().
  app.addEventListener("click", async (event) => {
    const navBtn = event.target.closest("button[data-view]");
    if (navBtn) {
      currentView = navBtn.dataset.view;
      return renderApp();
    }

    const optionBtn = event.target.closest(".engage-survey-option");
    if (optionBtn) return handleSelect(optionBtn);

    const submitBtn = event.target.closest(".engage-survey-submit");
    if (submitBtn) return handleVote(submitBtn);

    if (event.target.closest("#postComposerSubmit")) return handleCreatePost();

    const replyBtn = event.target.closest(".engage-reply-button");
    if (replyBtn) {
      const postId = replyBtn.dataset.postId;
      const input = app.querySelector(`.engage-reply-input[data-post-id="${postId}"]`);
      return handleAddComment(postId, input);
    }

    if (event.target.closest("#announcementSubmit")) return handleCreateAnnouncement();

    const editBtn = event.target.closest(".engage-announcement-edit");
    if (editBtn) {
      editingAnnouncementId = Number(editBtn.dataset.announcementId);
      return renderApp();
    }

    if (event.target.closest(".engage-announcement-cancel")) {
      editingAnnouncementId = null;
      return renderApp();
    }

    const saveBtn = event.target.closest(".engage-announcement-save");
    if (saveBtn) return handleSaveAnnouncement(Number(saveBtn.dataset.announcementId));

    const deleteBtn = event.target.closest(".engage-announcement-delete");
    if (deleteBtn) return handleDeleteAnnouncement(Number(deleteBtn.dataset.announcementId));

    const kudosDeleteBtn = event.target.closest(".engage-kudos-delete");
    if (kudosDeleteBtn) return handleDeleteKudos(Number(kudosDeleteBtn.dataset.kudosId));
  });

  app.addEventListener("submit", (event) => {
    if (event.target.closest("#kudosForm")) {
      event.preventDefault();
      handleGiveKudos();
    }
  });
})();
