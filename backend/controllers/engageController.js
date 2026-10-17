const engageModel = require("../models/engageModel");

const MAX_TITULO = 100;
const MAX_TEXTO = 2000;
const MAX_NOMBRE = 150;
const MAX_MENSAJE = 300;

const isAdmin = (user) => user.role === "Administrador";

// Marca qué publicaciones y aplausos puede modificar el usuario: el autor o un Administrador.
const feedFor = (feed, user) => feed.map((p) => ({ ...p, canEdit: p.authorId === user.id || isAdmin(user) }));
const kudosFor = (kudos, user) => kudos.map((k) => ({ ...k, canDelete: k.giverId === user.id || isAdmin(user) }));

// GET /api/engage — feed, encuestas, aplausos y cumpleaños del día.
async function index(req, res) {
  const user = req.session.user;
  const [feed, surveys, kudos, birthdays] = await Promise.all([
    engageModel.getFeed(),
    engageModel.getSurveys(user.id),
    engageModel.getKudos(),
    engageModel.getBirthdaysToday(),
  ]);

  const feedWithPerms = feedFor(feed, user);
  res.json({
    feed: feedWithPerms,
    announcement: feedWithPerms[0] || null,
    surveys,
    kudos: kudosFor(kudos, user),
    birthdays,
  });
}

// Valida título y texto de una noticia. Devuelve { error } o { title, text }.
function readNewsBody(body) {
  const title = typeof (body && body.title) === "string" ? body.title.trim() : "";
  const text = typeof (body && body.text) === "string" ? body.text.trim() : "";
  if (!title) return { error: "El título es obligatorio." };
  if (title.length > MAX_TITULO) return { error: `El título no puede pasar de ${MAX_TITULO} caracteres.` };
  if (!text) return { error: "El texto es obligatorio." };
  if (text.length > MAX_TEXTO) return { error: `El texto no puede pasar de ${MAX_TEXTO} caracteres.` };
  return { title, text };
}

// POST /api/engage/news   body: { title, text }
async function createNews(req, res) {
  const user = req.session.user;
  const data = readNewsBody(req.body);
  if (data.error) return res.status(400).json({ error: data.error });

  await engageModel.createNews(user.id, data);
  res.status(201).json({ feed: feedFor(await engageModel.getFeed(), user) });
}

// PATCH /api/engage/news/:id   body: { title, text }
async function updateNews(req, res) {
  const user = req.session.user;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Publicación inválida." });

  const data = readNewsBody(req.body);
  if (data.error) return res.status(400).json({ error: data.error });

  const result = await engageModel.updateNews(user.id, isAdmin(user), id, data);
  if (!result.ok) return res.status(404).json({ error: result.error });

  res.json({ feed: feedFor(await engageModel.getFeed(), user) });
}

// DELETE /api/engage/news/:id — baja lógica
async function deleteNews(req, res) {
  const user = req.session.user;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Publicación inválida." });

  const result = await engageModel.deleteNews(user.id, isAdmin(user), id);
  if (!result.ok) return res.status(404).json({ error: result.error });

  res.json({ feed: feedFor(await engageModel.getFeed(), user) });
}

// POST /api/engage/surveys/:id/vote   body: { optionId }
async function vote(req, res) {
  const surveyId = Number(req.params.id);
  const optionId = Number(req.body && req.body.optionId);
  if (!Number.isInteger(surveyId) || !Number.isInteger(optionId)) {
    return res.status(400).json({ error: "Datos inválidos." });
  }

  const userId = req.session.user.id;
  const result = await engageModel.voteSurvey(userId, surveyId, optionId);
  if (!result.ok) return res.status(409).json({ error: result.error });

  res.json({ surveys: await engageModel.getSurveys(userId) });
}

// POST /api/engage/kudos   body: { name, message? }
async function giveKudos(req, res) {
  const user = req.session.user;
  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name) return res.status(400).json({ error: "Indica a quién quieres reconocer." });
  if (name.length > MAX_NOMBRE) return res.status(400).json({ error: `El nombre no puede pasar de ${MAX_NOMBRE} caracteres.` });
  if (message.length > MAX_MENSAJE) return res.status(400).json({ error: `El mensaje no puede pasar de ${MAX_MENSAJE} caracteres.` });

  await engageModel.giveKudos(user.id, { name, message });
  res.status(201).json({ kudos: kudosFor(await engageModel.getKudos(), user) });
}

// DELETE /api/engage/kudos/:id — retira un aplauso (baja lógica)
async function deleteKudos(req, res) {
  const user = req.session.user;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Aplauso inválido." });

  const result = await engageModel.deleteKudos(user.id, isAdmin(user), id);
  if (!result.ok) return res.status(404).json({ error: result.error });

  res.json({ kudos: kudosFor(await engageModel.getKudos(), user) });
}

module.exports = { index, createNews, updateNews, deleteNews, vote, giveKudos, deleteKudos };