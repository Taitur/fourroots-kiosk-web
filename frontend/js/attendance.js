// Ficha de asistencia: pinta la página con los datos de GET /api/attendance.
(async function () {
  const { esc } = Portal;
  const user = await Portal.requireSession();
  const isAdmin = user.role === "Administrador";
  const app = document.getElementById("app");

  // Administrador: colaborador que se está viendo (por defecto, él mismo) y mes de los registros.
  let viewing = user.id;
  let adminMonth = localMonth();
  let adminData = { employees: [], types: [] };
  let chart;

  function localMonth() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  async function load() {
  if (chart) { chart.destroy(); chart = null; }
  const res = await Portal.get("/attendance" + (isAdmin && viewing && viewing !== user.id ? "?user=" + viewing : ""));
  if (!res.ok) {
    app.innerHTML = '<p style="padding:40px;">' + esc((res.data && res.data.error) || "No se pudo cargar la ficha.") + "</p>";
    return;
  }

  const model = res.data;
  const firstMetric = model.metrics[0];
  document.title = "Ficha de Asistencia · " + model.employee.name + " — Portal Eslabon";

  // ---- HTML ----
  const metricCards = model.metrics.map((m) => {
    const first = m.key === firstMetric.key;
    return `<button type="button" class="dash-module-card${first ? " active" : ""}" data-metric="${esc(m.key)}" aria-pressed="${first}">
        <svg viewBox="0 0 24 24">${m.iconSvg}</svg>
        <div class="dash-module-card-label">${esc(m.label)}</div>
      </button>`;
  }).join("");

  const timeline = model.promotions.map((p, i) => `<div class="dash-tl-item${p.upcoming ? " upcoming" : ""}">
        <div class="dash-tl-date">${esc(p.date)}</div>
        <div class="dash-tl-title">${esc(p.title)}</div>
        <div class="dash-tl-desc">${esc(p.description)}</div>
        ${isAdmin && p.key ? `<button type="button" class="adm-btn" data-edit-promo="${i}">Editar</button>
        <form class="adm-promo-form" data-promo-form="${i}" hidden>
          <label>Fecha<input type="date" name="date" value="${esc(p.isoDate)}" required></label>
          <label>Motivo<input type="text" name="reason" maxlength="200" value="${esc(p.reason)}"></label>
          <button type="submit" class="adm-btn adm-btn-primary">Guardar</button>
          <button type="button" class="adm-btn" data-cancel-promo="${i}">Cancelar</button>
        </form>` : ""}
      </div>`).join("");

  // Solo administrador: selector de colaborador y panel para editar los registros del mes.
  const adminBar = isAdmin ? `<div class="adm-bar">
        <label for="adm-employee">Colaborador</label>
        <select id="adm-employee">${adminData.employees.map((e) =>
          `<option value="${e.id}"${e.id === viewing ? " selected" : ""}>${esc(e.name)}${e.linked ? "" : " · sin empleado"}${e.active ? "" : " · inactivo"}</option>`).join("")}</select>
      </div>` : "";

  const adminPanel = isAdmin ? `<div class="dash-module-head">
      <div class="dash-module-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
      </div>
      <div>
        <div class="dash-module-title">Registros de asistencia</div>
        <div class="dash-module-desc">Solo administrador: corrige los días y da horas extra a este colaborador</div>
      </div>
    </div>
    <div class="dash-panel">
      <div class="adm-toolbar"><label>Mes <input type="month" id="adm-month" value="${esc(adminMonth)}"></label></div>
      <div id="adm-records"></div>
    </div>` : "";

  app.innerHTML = `
<div class="dash-page">

  <div class="dash-topbar">
    <a class="dash-brand" style="text-decoration:none;" href="dashboard.html">
      <div class="dash-brand-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" /></svg>
      </div>
      <span class="dash-brand-name">Eslabon</span>
    </a>
    <div class="dash-profile">
      <div class="dash-profile-text">
        <div class="dash-profile-name">${esc(user.name)}</div>
        <div class="dash-profile-role">${esc(user.role)}</div>
      </div>
      <div class="dash-profile-avatar">${esc(user.initials)}</div>
    </div>
  </div>

  <div class="dash-wrap">

    <div class="dash-hero">
      <div class="dash-eyebrow">Ficha de asistencia · Recursos Humanos</div>
      <h1>Historial del<br>Empleado</h1>
      <p class="dash-sub">Consulta faltas, puntualidad, horas extra y ascensos de un colaborador a lo largo del tiempo, en un solo lugar.</p>
      ${adminBar}

      <div class="dash-punchcard">
        <div class="dash-pc-left">
          <div class="dash-pc-avatar">${esc(model.employee.initials)}</div>
          <div>
            <div class="dash-pc-name">${esc(model.employee.name)}</div>
            <div class="dash-pc-role">${esc(model.employee.role)}</div>
            <div class="dash-pc-meta">
              <div>ID<span>${esc(model.employee.employeeId)}</span></div>
              <div>Antigüedad<span>${esc(model.employee.seniority)}</span></div>
              <div>Turno<span>${esc(model.employee.shift)}</span></div>
            </div>
          </div>
        </div>
        <div class="dash-pc-right">
          <div class="dash-pc-status">${esc(model.periodStatus)}</div>
          <div class="dash-pc-date">${esc(model.periodRange)}</div>
        </div>
      </div>
    </div>

    <div class="dash-divider"></div>

    <div class="dash-stats">
      <div><div class="dash-stat-num warn">${model.totalFaltas}</div><div class="dash-stat-label">Faltas totales</div></div>
      <div><div class="dash-stat-num warn">${model.totalTardanzas}</div><div class="dash-stat-label">Llegadas tarde</div></div>
      <div><div class="dash-stat-num good">${model.totalTempranas}</div><div class="dash-stat-label">Llegadas temprano</div></div>
      <div><div class="dash-stat-num brass">${model.totalHorasExtra}</div><div class="dash-stat-label">Horas extra acumuladas</div></div>
      <div><div class="dash-stat-num">${model.totalAscensos}</div><div class="dash-stat-label">Ascensos</div></div>
    </div>

    <div class="dash-divider"></div>

    <div class="dash-module-head">
      <div class="dash-module-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
      </div>
      <div>
        <div class="dash-module-title">Asistencia</div>
        <div class="dash-module-desc">Historial mensual del colaborador</div>
      </div>
    </div>

    <div class="dash-modules">${metricCards}</div>

    <div class="dash-panel">
      <div class="dash-panel-top">
        <div>
          <div class="dash-section-title" id="dash-panel-title">${esc(firstMetric.chartTitle)}</div>
          <div class="dash-section-sub" id="dash-panel-sub">${esc(model.periodRangeLong)}</div>
        </div>
        <div class="dash-panel-figures">
          <div>
            <div class="dash-pf-num" id="dash-pf-total"></div>
            <div class="dash-pf-label">Total del periodo</div>
          </div>
          <div>
            <div class="dash-pf-num" id="dash-pf-avg"></div>
            <div class="dash-pf-label">Promedio mensual</div>
          </div>
        </div>
      </div>
      <div class="dash-chart-wrap">
        <canvas id="dash-metric-chart" role="img" aria-label="Gráfica mensual de la métrica de asistencia seleccionada"></canvas>
      </div>
    </div>

    ${adminPanel}

    <div class="dash-module-head">
      <div class="dash-module-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V10l8-6 8 6v11M9 21v-6h6v6" /></svg>
      </div>
      <div>
        <div class="dash-module-title">Ascensos</div>
        <div class="dash-module-desc">Trayectoria del colaborador dentro de la empresa</div>
      </div>
    </div>

    <div class="dash-panel"><div class="dash-timeline">${timeline}</div></div>

    <footer class="dash-footer">
      <p>Portal empresarial · Módulo de Nómina</p>
    </footer>

  </div>
</div>`;

  // ---- Gráfica ----
  const months = model.months;
  const metricData = Object.fromEntries(
    model.metrics.map((m) => [m.key, { values: m.values, color: m.color, unit: m.unit, name: m.chartTitle }])
  );

  const titleEl = document.getElementById("dash-panel-title");
  const totalEl = document.getElementById("dash-pf-total");
  const avgEl = document.getElementById("dash-pf-avg");

  function renderChart(metric) {
    const d = metricData[metric];
    if (!d) return;

    titleEl.textContent = d.name;
    const total = d.values.reduce((a, b) => a + b, 0);
    const unit = d.unit || "";
    totalEl.textContent = total + unit;
    avgEl.textContent = (total / d.values.length).toFixed(1) + unit;

    if (chart) chart.destroy();
    chart = new Chart(document.getElementById("dash-metric-chart"), {
      type: "bar",
      data: {
        labels: months,
        datasets: [{ label: d.name, data: d.values, backgroundColor: d.color, borderRadius: 4, maxBarThickness: 34 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: "IBM Plex Mono", size: 12 }, color: "#5B6472" } },
          y: { beginAtZero: true, grid: { color: "#EAEBE7" }, ticks: { font: { family: "IBM Plex Mono", size: 12 }, color: "#5B6472" } },
        },
      },
    });
  }

  document.querySelectorAll(".dash-module-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".dash-module-card").forEach((c) => {
        c.classList.remove("active");
        c.setAttribute("aria-pressed", "false");
      });
      card.classList.add("active");
      card.setAttribute("aria-pressed", "true");
      renderChart(card.dataset.metric);
    });
  });

  renderChart(firstMetric.key);
  if (isAdmin) setupAdmin(model);
  }

  // ---- Administrador ----
  function toast(text, isError) {
    const el = document.createElement("div");
    el.className = "adm-toast" + (isError ? " is-error" : "");
    el.setAttribute("role", "status");
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  // Vuelve a pintar la ficha (cifras, gráfica y ascensos) conservando la posición en la página.
  async function refresh() {
    const y = window.scrollY;
    await load();
    window.scrollTo(0, y);
  }

  async function renderRecords() {
    const box = document.getElementById("adm-records");
    if (!box) return;
    if (!viewing) { box.innerHTML = '<p class="adm-empty">Elige un colaborador para ver sus registros.</p>'; return; }
    const res = await Portal.get("/attendance/records?user=" + viewing + "&month=" + adminMonth);
    if (!res.ok) { box.innerHTML = '<p class="adm-empty">' + esc((res.data && res.data.error) || "No se pudieron cargar los registros.") + "</p>"; return; }

    const byDate = Object.fromEntries(res.data.records.map((r) => [r.date, r]));
    const [year, month] = adminMonth.split("-").map(Number);
    const days = new Date(year, month, 0).getDate();
    const weekdays = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
    let rows = "";
    for (let d = 1; d <= days; d++) {
      const iso = adminMonth + "-" + String(d).padStart(2, "0");
      const record = byDate[iso] || { type: "", overtime: 0 };
      const current = record.type;
      const options = ['<option value="">Sin registro</option>']
        .concat(adminData.types.map((t) => `<option value="${esc(t)}"${t.toLowerCase() === current.toLowerCase() ? " selected" : ""}>${esc(t)}</option>`));
      rows += `<tr data-date="${iso}">
          <td class="adm-day">${d}<span>${weekdays[new Date(year, month - 1, d).getDay()]}</span></td>
          <td><select class="adm-type">${options.join("")}</select></td>
          <td><input type="number" class="adm-hours" min="0" max="12" step="0.5" value="${record.overtime || 0}" aria-label="Horas extra del día ${d}"></td>
          <td class="adm-actions">
            <button type="button" class="adm-btn adm-btn-primary" data-save>Guardar</button>
            <button type="button" class="adm-btn" data-remove${current ? "" : " disabled"}>Quitar</button>
          </td>
        </tr>`;
    }
    box.innerHTML = '<table class="adm-table"><thead><tr><th>Día</th><th>Tipo</th><th>Horas extra</th><th></th></tr></thead><tbody>' + rows + "</tbody></table>";

    box.querySelectorAll("tr[data-date]").forEach((tr) => {
      const date = tr.dataset.date;
      tr.querySelector("[data-save]").addEventListener("click", async () => {
        const type = tr.querySelector(".adm-type").value;
        const overtime = Number(tr.querySelector(".adm-hours").value) || 0;
        if (!type && !overtime) return toast("Elige un tipo o indica horas extra, o usa Quitar para borrar el registro.", true);
        const r = await Portal.patch("/attendance/records", { user: viewing, date, type: type || undefined, overtime });
        if (!r.ok) return toast((r.data && r.data.error) || "No se pudo guardar.", true);
        toast("Registro guardado.");
        await refresh();
      });
      tr.querySelector("[data-remove]").addEventListener("click", async () => {
        const r = await Portal.del("/attendance/records", { user: viewing, date });
        if (!r.ok) return toast((r.data && r.data.error) || "No se pudo quitar.", true);
        toast("Registro quitado.");
        await refresh();
      });
    });
  }

  function setupAdmin(model) {
    document.getElementById("adm-employee").addEventListener("change", (e) => {
      viewing = Number(e.target.value) || user.id;
      load();
    });
    document.getElementById("adm-month").addEventListener("change", (e) => {
      if (!e.target.value) return;
      adminMonth = e.target.value;
      renderRecords();
    });
    renderRecords();

    document.querySelectorAll("[data-edit-promo]").forEach((btn) =>
      btn.addEventListener("click", () => {
        document.querySelector('[data-promo-form="' + btn.dataset.editPromo + '"]').hidden = false;
        btn.hidden = true;
      })
    );
    document.querySelectorAll("[data-cancel-promo]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const i = btn.dataset.cancelPromo;
        document.querySelector('[data-promo-form="' + i + '"]').hidden = true;
        document.querySelector('[data-edit-promo="' + i + '"]').hidden = false;
      })
    );
    document.querySelectorAll("[data-promo-form]").forEach((form) =>
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const promo = model.promotions[Number(form.dataset.promoForm)];
        const r = await Portal.patch("/attendance/promotions", {
          user: viewing, key: promo.key, date: form.date.value, reason: form.reason.value,
        });
        if (!r.ok) return toast((r.data && r.data.error) || "No se pudo guardar el ascenso.", true);
        toast("Ascenso actualizado.");
        await refresh();
      })
    );
  }

  if (isAdmin) {
    const list = await Portal.get("/attendance/employees");
    if (list.ok) adminData = list.data;
  }
  load();
})();
