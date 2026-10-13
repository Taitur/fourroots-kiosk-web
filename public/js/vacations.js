(function () {
  const data = window.VACATIONS;
  const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  const daysEl = document.getElementById("calDays");
  const titleEl = document.getElementById("calTitle");
  const prevBtn = document.getElementById("calPrev");
  const nextBtn = document.getElementById("calNext");
  const tipsEl = document.getElementById("calTips");
  const selectionEl = document.getElementById("vacSelection");
  const selectionTextEl = document.getElementById("vacSelectionText");
  const submitBtn = document.getElementById("vacSubmit");
  const clearBtn = document.getElementById("vacClear");
  const messageEl = document.getElementById("vacMessage");

  const holidays = new Map(data.holidays.map((h) => [h.date, h.name]));
  let requested = new Set(data.requestedDays);
  let restantes = data.restantes;
  const selected = new Set();

  const todayParts = data.today.split("-").map(Number);
  let month = todayParts[1] - 1; // mes mostrado (0-11), siempre dentro de data.year

  // ---- fechas ----
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const weekdayOf = (y, m, d) => new Date(y, m, d).getDay();

  function dayState(y, m, d) {
    const key = iso(y, m, d);
    const weekday = weekdayOf(y, m, d);
    if (holidays.has(key)) return "holiday";
    if (requested.has(key)) return "requested";
    if (weekday === 0 || weekday === 6 || key < data.today) return "disabled";
    return selected.has(key) ? "selected" : "available";
  }

  // ---- calendario ----
  function render() {
    const y = data.year;
    titleEl.textContent = `${MONTHS[month]} ${y}`;
    prevBtn.disabled = month === 0;
    nextBtn.disabled = month === 11;

    const firstWeekday = weekdayOf(y, month, 1);
    const daysInMonth = new Date(y, month + 1, 0).getDate();
    const daysInPrev = new Date(y, month, 0).getDate();
    const cells = [];

    for (let i = firstWeekday - 1; i >= 0; i--) {
      cells.push(`<div class="ks-cal-day is-outside">${daysInPrev - i}</div>`);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = iso(y, month, d);
      const state = dayState(y, month, d);
      const classes = ["ks-cal-day"];
      if (state !== "available") classes.push("is-" + state);
      if (key === data.today) classes.push("is-today");
      const title = holidays.get(key) || (state === "requested" ? "Vacaciones solicitadas" : "");
      cells.push(`<div class="${classes.join(" ")}" data-date="${key}"${title ? ` title="${title}"` : ""}>${d}</div>`);
    }
    const trailing = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= trailing; d++) cells.push(`<div class="ks-cal-day is-outside">${d}</div>`);

    daysEl.innerHTML = cells.join("");
    renderTips();
  }

  // Sugerencias: festivos del mes y qué día tomar para hacer "puente".
  function renderTips() {
    const y = data.year;
    const tips = data.holidays
      .filter((h) => Number(h.date.slice(5, 7)) - 1 === month)
      .map((h) => {
        const d = Number(h.date.slice(8, 10));
        const weekday = weekdayOf(y, month, d);
        const label = `${h.name} (${WEEKDAYS[weekday]} ${d})`;
        if (h.date < data.today) return `${label}: ya pasó.`;
        if (weekday === 1 || weekday === 5) return `${label}: fin de semana largo sin usar días.`;
        if (weekday === 2) return `${label}: toma el lunes ${d - 1} y tendrás 4 días seguidos.`;
        if (weekday === 4) return `${label}: toma el viernes ${d + 1} y tendrás 4 días seguidos.`;
        if (weekday === 3) return `${label}: con 2 días (lun–mar o jue–vie) tendrás 5 seguidos.`;
        return `${label}: cae en fin de semana.`;
      });

    tipsEl.innerHTML = tips.length
      ? tips.map((t) => `<span style="display:block;">• ${t}</span>`).join("")
      : "No hay feriados este mes. Navega a otros meses para ver sugerencias inteligentes.";
  }

  function renderSelection() {
    selectionEl.hidden = selected.size === 0;
    const n = selected.size;
    selectionTextEl.textContent = `${n} ${n === 1 ? "día seleccionado" : "días seleccionados"} · te quedarían ${restantes - n}`;
  }

  function showMessage(text, isError) {
    messageEl.hidden = !text;
    messageEl.textContent = text || "";
    messageEl.classList.toggle("is-error", Boolean(isError));
  }

  function updateSummary(summary) {
    document.querySelectorAll("[data-summary]").forEach((el) => {
      el.textContent = summary[el.dataset.summary];
    });
  }

  // ---- eventos ----
  daysEl.addEventListener("click", (e) => {
    const cell = e.target.closest("[data-date]");
    if (!cell) return;
    const [y, m, d] = cell.dataset.date.split("-").map(Number);
    const state = dayState(y, m - 1, d);
    if (state !== "available" && state !== "selected") return;

    showMessage("");
    if (state === "selected") {
      selected.delete(cell.dataset.date);
    } else if (selected.size >= restantes) {
      return showMessage(`Solo te quedan ${restantes} días disponibles.`, true);
    } else {
      selected.add(cell.dataset.date);
    }
    render();
    renderSelection();
  });

  prevBtn.addEventListener("click", () => { if (month > 0) { month--; render(); } });
  nextBtn.addEventListener("click", () => { if (month < 11) { month++; render(); } });

  clearBtn.addEventListener("click", () => {
    selected.clear();
    showMessage("");
    render();
    renderSelection();
  });

  submitBtn.addEventListener("click", async () => {
    submitBtn.disabled = true;
    showMessage("");
    try {
      const res = await fetch("/Vacations/Request", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN },
        body: JSON.stringify({ days: [...selected].sort() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return showMessage(body.error || "No se pudo enviar la solicitud.", true);

      requested = new Set(body.summary.requestedDays);
      restantes = body.summary.restantes;
      updateSummary(body.summary);
      selected.clear();
      render();
      renderSelection();
      showMessage("Solicitud enviada. Queda en proceso de autorización.");
    } catch (err) {
      showMessage("No se pudo conectar con el servidor.", true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  render();
  renderSelection();
})();
