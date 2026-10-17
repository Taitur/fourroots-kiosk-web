// Ficha de asistencia: pinta la página con los datos de GET /api/attendance.
(async function () {
  const { esc } = Portal;
  const user = await Portal.requireSession();

  const res = await Portal.get("/attendance");
  const app = document.getElementById("app");
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

  const timeline = model.promotions.map((p) => `<div class="dash-tl-item${p.upcoming ? " upcoming" : ""}">
        <div class="dash-tl-date">${esc(p.date)}</div>
        <div class="dash-tl-title">${esc(p.title)}</div>
        <div class="dash-tl-desc">${esc(p.description)}</div>
      </div>`).join("");

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
  let chart;

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
})();
