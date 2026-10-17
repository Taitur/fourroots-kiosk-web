(async function () {
  await Portal.requireSession();
  const loaded = await Portal.get("/incidences");
  if (!loaded.ok) {
    const box = document.getElementById("incMessage");
    box.hidden = false;
    box.classList.add("is-error");
    box.textContent = (loaded.data && loaded.data.error) || "No se pudieron cargar tus solicitudes.";
    return;
  }
  const data = loaded.data;
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const $ = (id) => document.getElementById(id);
  const typesEl = $("incTypes");
  const form = $("incForm");
  const dateEl = $("incDate");
  const endDateEl = $("incEndDate");
  const startEl = $("incStart");
  const endEl = $("incEnd");
  const commentEl = $("incComment");
  const submitBtn = $("incSubmit");
  const summaryEl = $("incSummary");
  const messageEl = $("incMessage");
  const listEl = $("incList");

  let selectedType = null;
  let requests = data.requests;

  // ---- fechas ----
  const pad = (n) => String(n).padStart(2, "0");
  const addDays = (iso, n) => {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d + n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const prettyDate = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };

  // ---- tipos ----
  function renderTypes() {
    typesEl.replaceChildren(
      ...data.types.map((t) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ks-inc-type" + (selectedType && selectedType.id === t.id ? " is-selected" : "");
        btn.dataset.id = t.id;
        btn.setAttribute("aria-pressed", String(Boolean(selectedType && selectedType.id === t.id)));
        // El icono es SVG propio definido en el servidor (helpers/incidenceTypes.js).
        btn.innerHTML = `<span class="ks-inc-type-icon"><svg class="ks-icon" viewBox="0 0 24 24">${t.icon}</svg></span><span><div class="ks-inc-type-name"></div><div class="ks-inc-type-hint"></div></span>`;
        btn.querySelector(".ks-inc-type-name").textContent = t.label;
        btn.querySelector(".ks-inc-type-hint").textContent = t.hint;
        return btn;
      })
    );
  }

  typesEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".ks-inc-type");
    if (!btn) return;
    selectedType = data.types.find((t) => t.id === Number(btn.dataset.id));
    showMessage("");
    renderTypes();
    applyType();
  });

  // Muestra los campos que corresponden al tipo (horas o días).
  function applyType() {
    const byHours = selectedType.mode === "hours";
    $("incEndDateField").hidden = byHours;
    $("incStartField").hidden = !byHours;
    $("incEndField").hidden = !byHours;
    $("incDateLabel").textContent = byHours ? "Fecha" : "Desde";
    $("incCommentHint").textContent = selectedType.commentRequired ? "(obligatorio)" : "(opcional)";
    updateForm();
  }

  // ---- formulario ----
  function updateForm() {
    // Límites de los selectores de fecha.
    const min = addDays(data.today, -data.limits.daysBack);
    const max = addDays(data.today, data.limits.daysAhead);
    dateEl.min = endDateEl.min = min;
    dateEl.max = endDateEl.max = max;
    if (dateEl.value) endDateEl.min = dateEl.value;

    $("incCounter").textContent = `${commentEl.value.length}/${data.limits.maxComment}`;

    const problem = selectedType ? checkForm() : "Elige un tipo de incidencia.";
    submitBtn.disabled = Boolean(problem);
    summaryEl.hidden = !selectedType || Boolean(problem && !dateEl.value);
    if (!summaryEl.hidden) summaryEl.textContent = problem || describe();
  }

  // Devuelve un texto con el problema, o "" si el formulario está listo para enviarse.
  function checkForm() {
    if (!dateEl.value) return "Indica la fecha.";
    if (selectedType.mode === "hours") {
      if (!startEl.value || !endEl.value) return "Indica la hora de inicio y de fin.";
      if (endEl.value <= startEl.value) return "La hora de fin debe ser posterior a la de inicio.";
    } else {
      const end = endDateEl.value || dateEl.value;
      if (end < dateEl.value) return "La fecha final no puede ser anterior a la inicial.";
      if (addDays(dateEl.value, data.limits.maxRange - 1) < end) return `El permiso no puede durar más de ${data.limits.maxRange} días.`;
    }
    if (selectedType.commentRequired && !commentEl.value.trim()) return "Explica brevemente el motivo del permiso.";
    return "";
  }

  function describe() {
    if (selectedType.mode === "hours") {
      return `${selectedType.label}: ${prettyDate(dateEl.value)} de ${startEl.value} a ${endEl.value}`;
    }
    const end = endDateEl.value || dateEl.value;
    return end === dateEl.value
      ? `${selectedType.label}: ${prettyDate(dateEl.value)}`
      : `${selectedType.label}: del ${prettyDate(dateEl.value)} al ${prettyDate(end)}`;
  }

  [dateEl, endDateEl, startEl, endEl, commentEl].forEach((el) => el.addEventListener("input", updateForm));

  function resetForm() {
    form.reset();
    selectedType = null;
    renderTypes();
    $("incEndDateField").hidden = $("incStartField").hidden = $("incEndField").hidden = true;
    $("incDateLabel").textContent = "Fecha";
    updateForm();
  }

  function showMessage(text, isError) {
    messageEl.hidden = !text;
    messageEl.textContent = text || "";
    messageEl.classList.toggle("is-error", Boolean(isError));
  }

  // ---- envío y cancelación ----
  async function post(path, body) {
    const res = await Portal.post(path, body);
    return { ok: res.ok, json: res.data || {} };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    showMessage("");
    try {
      const byHours = selectedType.mode === "hours";
      const { ok, json } = await post("/incidences/requests", {
        type: selectedType.id,
        date: dateEl.value,
        endDate: byHours ? undefined : endDateEl.value || dateEl.value,
        startTime: byHours ? startEl.value : undefined,
        endTime: byHours ? endEl.value : undefined,
        comment: commentEl.value.trim(),
      });
      if (!ok) {
        showMessage(json.error || "No se pudo enviar la solicitud.", true);
        return updateForm();
      }
      requests = json.requests;
      resetForm();
      renderRequests();
      showMessage("Solicitud enviada. Queda en proceso de autorización.");
    } catch (err) {
      showMessage("No se pudo conectar con el servidor.", true);
      updateForm();
    }
  });

  listEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".ks-inc-cancel");
    if (!btn || !confirm("¿Cancelar esta solicitud?")) return;
    btn.disabled = true;
    try {
      const { ok, json } = await post(`/incidences/requests/${btn.dataset.id}/cancel`);
      if (!ok) {
        btn.disabled = false;
        return showMessage(json.error || "No se pudo cancelar la solicitud.", true);
      }
      requests = json.requests;
      renderRequests();
      showMessage("Solicitud cancelada.");
    } catch (err) {
      btn.disabled = false;
      showMessage("No se pudo conectar con el servidor.", true);
    }
  });

  // ---- lista ----
  function statusInfo(estatus) {
    if (estatus === data.status.aceptada) return { label: "Aceptada", cls: "is-aceptada" };
    if (estatus === data.status.cancelada) return { label: "Cancelada", cls: "is-cancelada" };
    return { label: "En proceso", cls: "is-proceso" };
  }

  function whenText(r) {
    if (r.horaInicio) return `${prettyDate(r.inicio)} · ${r.horaInicio} a ${r.horaFin}`;
    return r.inicio === r.fin
      ? prettyDate(r.inicio)
      : `${prettyDate(r.inicio)} al ${prettyDate(r.fin)} · ${r.dias} ${r.dias === 1 ? "día" : "días"}`;
  }

  function renderRequests() {
    $("statProceso").textContent = requests.filter((r) => r.estatus === data.status.enProceso).length;
    $("statAceptadas").textContent = requests.filter((r) => r.estatus === data.status.aceptada).length;
    $("statCanceladas").textContent = requests.filter((r) => r.estatus === data.status.cancelada).length;

    if (requests.length === 0) {
      const p = document.createElement("p");
      p.className = "ks-inc-empty";
      p.textContent = "Todavía no has enviado ninguna solicitud de permiso.";
      return listEl.replaceChildren(p);
    }

    listEl.replaceChildren(
      ...requests.map((r) => {
        const status = statusInfo(r.estatus);
        const item = document.createElement("div");
        item.className = "ks-inc-item";
        // Todo el texto dinámico se asigna con textContent (el comentario viene de la BD).
        item.innerHTML = `
          <div class="ks-inc-item-top"><span class="ks-inc-item-title"></span><span class="ks-inc-badge"></span></div>
          <div class="ks-inc-item-when"></div>
          <div class="ks-inc-item-comment" hidden></div>
          <div class="ks-inc-item-foot"><span></span></div>`;
        item.querySelector(".ks-inc-item-title").textContent = r.tipoNombre;
        const badge = item.querySelector(".ks-inc-badge");
        badge.textContent = status.label;
        badge.classList.add(status.cls);
        item.querySelector(".ks-inc-item-when").textContent = whenText(r);
        if (r.comentario) {
          const c = item.querySelector(".ks-inc-item-comment");
          c.hidden = false;
          c.textContent = r.comentario;
        }
        item.querySelector(".ks-inc-item-foot span").textContent = `Enviada el ${prettyDate(r.registro)}`;
        if (r.estatus === data.status.enProceso) {
          const cancel = document.createElement("button");
          cancel.type = "button";
          cancel.className = "ks-inc-cancel";
          cancel.dataset.id = r.id;
          cancel.textContent = "Cancelar";
          item.querySelector(".ks-inc-item-foot").appendChild(cancel);
        }
        return item;
      })
    );
  }

  renderTypes();
  renderRequests();
  updateForm();
})();
