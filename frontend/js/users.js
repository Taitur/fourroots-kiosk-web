// Administración de usuarios (alta, baja y cambios): solo para el rol Administrador.
// El backend ya rechaza con 403 a quien no sea admin; aquí solo evitamos pintar el
// formulario a alguien que de todos modos no podría usarlo.
(async function () {
  const { esc } = Portal;
  const user = await Portal.requireSession();
  const app = document.getElementById("app");

  if (user.role !== "Administrador") {
    app.innerHTML = `
      <div class="page-container">
        <a href="dashboard.html" style="display:inline-flex; align-items:center; gap:6px; color:var(--ink-dim); text-decoration:none; font-size:0.85rem; font-weight:600; margin-bottom:18px;">
          <svg class="ks-icon" viewBox="0 0 24 24" style="width:16px; height:16px;"><path d="M15 18l-6-6 6-6"/></svg>
          Volver al Dashboard
        </a>
        <h1 class="page-title">Acceso restringido</h1>
        <p class="ks-vac-lead">Esta sección es solo para administradores.</p>
      </div>`;
    return;
  }

  let users = [];
  let editingId = null;
  let message = null;

  app.innerHTML = `
    <div class="page-container">
      <a href="dashboard.html" style="display:inline-flex; align-items:center; gap:6px; color:var(--ink-dim); text-decoration:none; font-size:0.85rem; font-weight:600; margin-bottom:18px;">
        <svg class="ks-icon" viewBox="0 0 24 24" style="width:16px; height:16px;"><path d="M15 18l-6-6 6-6"/></svg>
        Volver al Dashboard
      </a>

      <h1 class="page-title">Administrar<br>Usuarios</h1>
      <p class="ks-vac-lead">Alta, baja y cambios de acceso al portal.</p>

      <div class="ks-usr-grid">
        <div class="card-ks">
          <div class="ks-vac-side-head">
            <div class="ks-vac-side-icon">
              <svg class="ks-icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div>
              <div class="ks-vac-side-title">Nuevo usuario</div>
              <div class="ks-vac-side-subtitle">Crea un acceso al portal</div>
            </div>
          </div>

          <form id="usrForm" novalidate>
            <label class="ks-inc-field">
              <span class="ks-inc-label">Usuario</span>
              <input type="text" id="usrUsername" maxlength="30" required>
            </label>
            <label class="ks-inc-field">
              <span class="ks-inc-label">Contraseña</span>
              <input type="password" id="usrPassword" required>
            </label>
            <label class="ks-inc-field">
              <span class="ks-inc-label">ID de empleado (recursos) <span class="ks-inc-optional">(opcional)</span></span>
              <input type="number" id="usrEmployeeId">
            </label>
            <div class="ks-vac-message" id="usrMessage" hidden></div>
            <div class="ks-inc-actions">
              <button type="submit" class="ks-vac-btn" id="usrSubmit">Crear usuario</button>
            </div>
          </form>
        </div>

        <div class="card-ks">
          <div class="ks-vac-side-head">
            <div class="ks-vac-side-icon">
              <svg class="ks-icon" viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>
            </div>
            <div>
              <div class="ks-vac-side-title">Usuarios del portal</div>
              <div class="ks-vac-side-subtitle" id="usrCount"></div>
            </div>
          </div>
          <div id="usrTableWrap"></div>
        </div>
      </div>
    </div>`;

  const messageEl = document.getElementById("usrMessage");
  const tableWrap = document.getElementById("usrTableWrap");
  const countEl = document.getElementById("usrCount");

  function showMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.className = "ks-vac-message" + (isError ? " is-error" : "");
    messageEl.hidden = !text;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  }

  function renderRow(u) {
    if (editingId === u.id) {
      return `<tr class="ks-usr-edit-row">
        <td colspan="5">
          <div class="ks-usr-edit-fields">
            <label>Usuario<input type="text" data-edit="username" value="${esc(u.username)}" maxlength="30"></label>
            <label>Nueva contraseña (opcional)<input type="password" data-edit="password" placeholder="Dejar en blanco para no cambiarla"></label>
            <label>ID de empleado<input type="number" data-edit="employeeId" value="${u.employeeId ?? ""}"></label>
          </div>
          <div class="ks-usr-edit-actions">
            <button type="button" class="ks-vac-btn ks-vac-btn-ghost" id="usrCancelEdit">Cancelar</button>
            <button type="button" class="ks-vac-btn" id="usrSaveEdit" data-id="${u.id}">Guardar cambios</button>
          </div>
        </td>
      </tr>`;
    }

    return `<tr>
      <td><strong>${esc(u.username)}</strong>${u.name ? "<br><small style=\"color:var(--ink-faint);\">" + esc(u.name) + "</small>" : ""}</td>
      <td>${u.employeeId ?? "—"}</td>
      <td><span class="ks-usr-chip ${u.active ? "is-active" : "is-inactive"}">${u.active ? "Activo" : "Inactivo"}</span></td>
      <td>${esc(formatDate(u.createdAt))}</td>
      <td>
        <div class="ks-usr-row-actions">
          <button type="button" data-action="edit" data-id="${u.id}">Editar</button>
          <button type="button" data-action="toggle" data-id="${u.id}" data-active="${u.active}">${u.active ? "Desactivar" : "Activar"}</button>
          ${u.id === user.id ? "" : '<button type="button" class="is-danger" data-action="delete" data-id="' + u.id + '">Eliminar</button>'}
        </div>
      </td>
    </tr>`;
  }

  function renderTable() {
    countEl.textContent = users.length + " usuario" + (users.length === 1 ? "" : "s");
    tableWrap.innerHTML = `
      <table class="ks-usr-table">
        <thead><tr><th>Usuario</th><th>Empleado</th><th>Estado</th><th>Alta</th><th>Acciones</th></tr></thead>
        <tbody>${users.map(renderRow).join("") || '<tr><td colspan="5">No hay usuarios.</td></tr>'}</tbody>
      </table>`;

    tableWrap.querySelectorAll('[data-action="edit"]').forEach((btn) =>
      btn.addEventListener("click", () => { editingId = Number(btn.dataset.id); renderTable(); })
    );
    const cancelBtn = document.getElementById("usrCancelEdit");
    if (cancelBtn) cancelBtn.addEventListener("click", () => { editingId = null; renderTable(); });
    const saveBtn = document.getElementById("usrSaveEdit");
    if (saveBtn) saveBtn.addEventListener("click", () => saveEdit(Number(saveBtn.dataset.id)));

    tableWrap.querySelectorAll('[data-action="toggle"]').forEach((btn) =>
      btn.addEventListener("click", () => toggleActive(Number(btn.dataset.id), btn.dataset.active !== "true"))
    );
    tableWrap.querySelectorAll('[data-action="delete"]').forEach((btn) =>
      btn.addEventListener("click", () => removeUser(Number(btn.dataset.id)))
    );
  }

  async function loadUsers() {
    const res = await Portal.get("/users");
    if (!res.ok) {
      showMessage((res.data && res.data.error) || "No se pudieron cargar los usuarios.", true);
      return;
    }
    users = res.data;
    renderTable();
  }

  async function saveEdit(id) {
    const row = tableWrap.querySelector(`[data-edit="username"]`).closest("tr");
    const username = row.querySelector('[data-edit="username"]').value.trim();
    const password = row.querySelector('[data-edit="password"]').value;
    const employeeId = row.querySelector('[data-edit="employeeId"]').value;

    const res = await Portal.patch("/users/" + id, {
      username,
      password: password || undefined,
      employeeId: employeeId === "" ? null : Number(employeeId),
    });
    if (!res.ok) { showMessage((res.data && res.data.error) || "No se pudo guardar.", true); return; }

    showMessage("Usuario actualizado.", false);
    editingId = null;
    users = res.data.users;
    renderTable();
  }

  async function toggleActive(id, active) {
    const res = await Portal.patch("/users/" + id, { active });
    if (!res.ok) { showMessage((res.data && res.data.error) || "No se pudo actualizar.", true); return; }
    users = res.data.users;
    renderTable();
  }

  async function removeUser(id) {
    if (!confirm("¿Eliminar este usuario? Esta acción desactiva su acceso al portal.")) return;
    const res = await Portal.del("/users/" + id);
    if (!res.ok) { showMessage((res.data && res.data.error) || "No se pudo eliminar.", true); return; }
    showMessage("Usuario eliminado.", false);
    users = res.data.users;
    renderTable();
  }

  document.getElementById("usrForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("usrUsername").value.trim();
    const password = document.getElementById("usrPassword").value;
    const employeeId = document.getElementById("usrEmployeeId").value;

    const submitBtn = document.getElementById("usrSubmit");
    submitBtn.disabled = true;
    const res = await Portal.post("/users", { username, password, employeeId: employeeId === "" ? undefined : Number(employeeId) });
    submitBtn.disabled = false;

    if (!res.ok) { showMessage((res.data && res.data.error) || "No se pudo crear el usuario.", true); return; }

    showMessage("Usuario creado.", false);
    document.getElementById("usrForm").reset();
    users = res.data.users;
    renderTable();
  });

  await loadUsers();
})();
