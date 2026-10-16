const userModel = require("../models/userModel");

function toIntOrUndefined(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
}

// GET /api/users — solo Administrador (ver middleware requireAdmin)
async function list(req, res) {
  res.json(await userModel.listUsers());
}

// POST /api/users   body: { username, password, employeeId?, companyId? }
async function create(req, res) {
  const body = req.body || {};
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username) return res.status(400).json({ error: "El nombre de usuario es obligatorio." });
  if (username.length > 30) return res.status(400).json({ error: "El nombre de usuario no puede pasar de 30 caracteres." });
  if (!password.trim()) return res.status(400).json({ error: "La contraseña es obligatoria." });

  const result = await userModel.createUser(
    { username, password, employeeId: toIntOrUndefined(body.employeeId), companyId: toIntOrUndefined(body.companyId) },
    req.session.user.id
  );
  if (!result.ok) return res.status(400).json({ error: result.error });

  res.status(201).json({ id: result.id, users: await userModel.listUsers() });
}

// PATCH /api/users/:id   body: { username?, password?, employeeId?, companyId?, active? }
async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Usuario inválido." });

  const body = req.body || {};
  const patch = {};

  if (body.username !== undefined) {
    const username = String(body.username).trim();
    if (!username) return res.status(400).json({ error: "El nombre de usuario es obligatorio." });
    patch.username = username;
  }
  if (body.password !== undefined && String(body.password).trim()) patch.password = String(body.password);
  if (body.employeeId !== undefined) patch.employeeId = toIntOrUndefined(body.employeeId) ?? null;
  if (body.companyId !== undefined) patch.companyId = toIntOrUndefined(body.companyId) ?? null;
  if (body.active !== undefined) patch.active = Boolean(body.active);

  const result = await userModel.updateUser(id, patch);
  if (!result.ok) return res.status(400).json({ error: result.error });

  res.json({ users: await userModel.listUsers() });
}

// DELETE /api/users/:id — baja lógica; no se puede eliminar la propia cuenta.
async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Usuario inválido." });
  if (id === req.session.user.id) return res.status(400).json({ error: "No puedes eliminar tu propio usuario." });

  const result = await userModel.deleteUser(id);
  if (!result.ok) return res.status(404).json({ error: result.error });

  res.json({ users: await userModel.listUsers() });
}

module.exports = { list, create, update, remove };
