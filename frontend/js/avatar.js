// "Mi Avatar": pinta la página con GET /api/avatar, activa el editor visual (canvas)
// y guarda los cambios en kio_tbAvatarUsuario con PATCH /api/avatar.
(async function () {
  const { esc } = Portal;
  await Header.init();

  const res = await Portal.get("/avatar");
  const app = document.getElementById("app");
  if (!res.ok) {
    app.innerHTML = '<p style="padding:40px;">' + esc((res.data && res.data.error) || "No se pudo cargar tu avatar.") + "</p>";
    return;
  }

  const model = res.data;
  document.title = "Mi Avatar · " + model.employeeName + " — Portal Eslabon";

  // ---- HTML ----
  const contextItems = model.contextItems.map((item) => `
        <div class="av-context-item">
          <div class="av-context-icon"><svg class="ks-icon" viewBox="0 0 24 24">${item.iconSvg}</svg></div>
          <div>
            <div class="av-context-title">${esc(item.title)}</div>
            <div class="av-context-desc">${esc(item.description)}</div>
          </div>
        </div>`).join("");

  // Paneles de estilo: misma estructura para cabello, rostro, ropa y accesorios.
  const stylePanels = [
    { id: "panel-hair", category: "hairStyle", options: model.hairStyles, active: true },
    { id: "panel-face", category: "faceStyle", options: model.faceStyles },
    { id: "panel-clothing", category: "clothingStyle", options: model.clothingStyles },
    { id: "panel-accessories", category: "accessoryStyle", options: model.accessoryStyles },
  ];
  const colorGroups = [
    { label: "Tono de piel", category: "skinTone", colors: model.skinTones },
    { label: "Color de cabello", category: "hairColor", colors: model.hairColors },
    { label: "Color de ropa", category: "clothingColor", colors: model.clothingColors },
  ];

  const stylePanelsHtml = stylePanels.map((panel) => `
      <div class="av-editor-panel${panel.active ? " active" : ""}" id="${panel.id}">
        <div class="ks-hat-row">${panel.options.map((opt) => `
          <button type="button" class="ks-hat-btn${opt.key === model.currentAvatar[panel.category] ? " active" : ""}"
                  data-category="${panel.category}" data-value="${esc(opt.key)}">${esc(opt.label)}</button>`).join("")}
        </div>
      </div>`).join("");

  const colorGroupsHtml = colorGroups.map((group) => `
        <div class="av-color-group">
          <div class="av-color-label">${group.label}</div>
          <div class="ks-swatch-row" style="justify-content:flex-start;">${group.colors.map((color) => `
            <div class="ks-swatch${color === model.currentAvatar[group.category] ? " active" : ""}"
                 style="background:${esc(color)};" data-category="${group.category}" data-value="${esc(color)}"></div>`).join("")}
          </div>
        </div>`).join("");

  app.innerHTML = `
<div class="page-container">

  <a href="dashboard.html" style="display:inline-flex; align-items:center; gap:6px; color:var(--ink-dim); text-decoration:none; font-size:0.85rem; font-weight:600; margin-bottom:18px;">
    <svg class="ks-icon" viewBox="0 0 24 24" style="width:16px; height:16px;"><path d="M15 18l-6-6 6-6"/></svg>
    Volver al Dashboard
  </a>

  <div class="av-header">
    <div class="av-eyebrow">Capital Humano · Mi Perfil</div>
    <h1 class="page-title">Mi Avatar</h1>
    <p class="page-subtitle">Personaliza tu representación visual dentro de Eslabón.</p>
  </div>

  <div class="ks-profile-wrap">

    <!-- ============ LEFT COLUMN ============ -->
    <div>
      <div class="card-ks" style="text-align:center; margin-bottom:18px;">
        <canvas id="avatarPreview" class="av-preview-canvas" width="200" height="200"></canvas>
        <div class="av-preview-name">${esc(model.employeeName)}</div>
        <div class="av-preview-role">${esc(model.employeeRole)}</div>
        <div class="av-preview-meta"><span class="ks-tag ks-tag-wellness">${esc(model.statusLabel)}</span></div>
        <div class="av-last-edited" id="avLastEdited">${esc(model.lastEditedText)}</div>
      </div>

      <div class="card-ks">
        <h3 style="font-size:0.95rem; margin-bottom:4px;">¿Dónde aparece tu avatar?</h3>
        <p style="font-size:0.78rem; color:var(--ink-dim); margin-bottom:6px;">Presencia en el portal empresarial</p>${contextItems}
      </div>
    </div>

    <!-- ============ RIGHT COLUMN: EDITOR ============ -->
    <div class="card-ks">
      <div class="av-editor-head">
        <h2 class="av-editor-title">Editor de avatar</h2>
        <p class="av-editor-sub">Elige cabello, rostro, ropa, accesorios y colores. Los cambios se ven al instante en la vista previa.</p>
      </div>

      <div class="ks-tabs">
        <div class="ks-tab active" data-target="panel-hair">Cabello</div>
        <div class="ks-tab" data-target="panel-face">Rostro</div>
        <div class="ks-tab" data-target="panel-clothing">Ropa</div>
        <div class="ks-tab" data-target="panel-accessories">Accesorios</div>
        <div class="ks-tab" data-target="panel-colors">Colores</div>
      </div>
${stylePanelsHtml}
      <div class="av-editor-panel" id="panel-colors">${colorGroupsHtml}
      </div>

      <div class="av-actions-bar">
        <button type="button" class="btn-ks btn-ks-ghost" id="avCancel">Cancelar</button>
        <button type="button" class="btn-ks btn-ks-primary" id="avSave">Guardar cambios</button>
      </div>
    </div>

  </div>
</div>

<div class="ks-toast" id="avToast">Avatar actualizado</div>`;

  // ---- Editor (canvas) ----
  const savedConfig = model.currentAvatar;

  let saved = { ...savedConfig };
  let current = { ...savedConfig };

  const previewCanvas = document.getElementById("avatarPreview");
  const toast = document.getElementById("avToast");
  const lastEditedEl = document.getElementById("avLastEdited");
  let toastTimer;

  function render() {
    window.AvatarDraw.draw(previewCanvas, current);
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function syncControls(cfg) {
    document.querySelectorAll("[data-category]").forEach(el => {
      const cat = el.dataset.category;
      el.classList.toggle("active", el.dataset.value === cfg[cat]);
    });
  }

  // tabs
  document.querySelectorAll(".ks-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".ks-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".av-editor-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.target).classList.add("active");
    });
  });

  // style pills + color swatches (share the same data-category / data-value contract)
  document.querySelectorAll("[data-category]").forEach(el => {
    el.addEventListener("click", () => {
      const cat = el.dataset.category;
      current[cat] = el.dataset.value;
      document.querySelectorAll('[data-category="' + cat + '"]').forEach(sib => sib.classList.remove("active"));
      el.classList.add("active");
      render();
    });
  });

  document.getElementById("avSave").addEventListener("click", async () => {
    const res = await Portal.patch("/avatar", current);
    if (!res.ok) {
      showToast((res.data && res.data.error) || "No se pudo guardar tu avatar.");
      return;
    }
    saved = { ...current };
    lastEditedEl.textContent = res.data.lastEditedText;
    showToast("Avatar actualizado");
    Header.renderAvatar();
  });

  document.getElementById("avCancel").addEventListener("click", () => {
    current = { ...saved };
    syncControls(current);
    render();
    showToast("Cambios descartados");
  });

  render();
})();
