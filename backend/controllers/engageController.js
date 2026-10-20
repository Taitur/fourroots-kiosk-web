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
  const [feed, surveys, kudos, birthdays, posts] = await Promise.all([
    engageModel.getFeed(),
    engageModel.getSurveys(user.id),
    engageModel.getKudos(),
    engageModel.getBirthdaysToday(),
    engageModel.getPosts(),
  ]);

  const feedWithPerms = feedFor(feed, user);
  res.json({
    feed: feedWithPerms,
    announcement: feedWithPerms[0] || null,
    surveys,
    kudos: kudosFor(kudos, user),
    birthdays,
    posts,
  });
}

// POST /api/engage/posts   body: { texto }
async function createPost(req, res) {
  const texto = req.body && req.body.texto;
  const result = await engageModel.createPost(req.session.user.id, texto);
  if (!result.ok) return res.status(400).json({ error: result.error });

  const posts = await engageModel.getPosts();
  res.json({ posts });
}

// POST /api/engage/posts/:id/comments   body: { texto }
async function addComment(req, res) {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId)) {
    return res.status(400).json({ error: "Publicación inválida." });
  }

  const texto = req.body && req.body.texto;
  const result = await engageModel.addComment(req.session.user.id, postId, texto);
  if (!result.ok) return res.status(400).json({ error: result.error });

  const posts = await engageModel.getPosts();
  res.json({ posts });
}

// POST /api/engage/announcements   body: { title, text } — solo Administrador
async function createAnnouncement(req, res) {
  const title = (req.body && req.body.title) || "";
  const text = (req.body && req.body.text) || "";
  if (!title.trim() || !text.trim()) {
    return res.status(400).json({ error: "Escribe un título y un texto para el anuncio." });
  }
  if (title.length > MAX_TITULO) {
    return res.status(400).json({ error: `El título no puede superar ${MAX_TITULO} caracteres.` });
  }
  if (text.length > MAX_TEXTO) {
    return res.status(400).json({ error: `El texto no puede superar ${MAX_TEXTO} caracteres.` });
  }

  await engageModel.createNews(req.session.user.id, { title: title.trim(), text: text.trim() });

  const feed = await engageModel.getFeed();
  res.json({ feed: feedFor(feed, req.session.user) });
}

// PATCH /api/engage/announcements/:id   body: { title, text } — autor o Administrador
async function updateAnnouncement(req, res) {
  const newsId = Number(req.params.id);
  if (!Number.isInteger(newsId)) {
    return res.status(400).json({ error: "Anuncio inválido." });
  }

  const title = (req.body && req.body.title) || "";
  const text = (req.body && req.body.text) || "";
  if (!title.trim() || !text.trim()) {
    return res.status(400).json({ error: "Escribe un título y un texto para el anuncio." });
  }
  if (title.length > MAX_TITULO) {
    return res.status(400).json({ error: `El título no puede superar ${MAX_TITULO} caracteres.` });
  }
  if (text.length > MAX_TEXTO) {
    return res.status(400).json({ error: `El texto no puede superar ${MAX_TEXTO} caracteres.` });
  }

  const user = req.session.user;
  const result = await engageModel.updateNews(user.id, isAdmin(user), newsId, { title: title.trim(), text: text.trim() });
  if (!result.ok) return res.status(403).json({ error: result.error });

  const feed = await engageModel.getFeed();
  res.json({ feed: feedFor(feed, user) });
}

// DELETE /api/engage/announcements/:id — autor o Administrador
async function deleteAnnouncement(req, res) {
  const newsId = Number(req.params.id);
  if (!Number.isInteger(newsId)) {
    return res.status(400).json({ error: "Anuncio inválido." });
  }

  const user = req.session.user;
  const result = await engageModel.deleteNews(user.id, isAdmin(user), newsId);
  if (!result.ok) return res.status(403).json({ error: result.error });

  const feed = await engageModel.getFeed();
  res.json({ feed: feedFor(feed, user) });
}

// POST /api/engage/kudos   body: { name, message }
async function createKudos(req, res) {
  const name = ((req.body && req.body.name) || "").trim();
  const message = ((req.body && req.body.message) || "").trim();
  if (!name) {
    return res.status(400).json({ error: "Escribe el nombre de quien reconoces." });
  }
  if (name.length > MAX_NOMBRE) {
    return res.status(400).json({ error: `El nombre no puede superar ${MAX_NOMBRE} caracteres.` });
  }
  if (message.length > MAX_MENSAJE) {
    return res.status(400).json({ error: `El mensaje no puede superar ${MAX_MENSAJE} caracteres.` });
  }

  await engageModel.giveKudos(req.session.user.id, { name, message });

  const kudos = await engageModel.getKudos();
  res.json({ kudos: kudosFor(kudos, req.session.user) });
}

// DELETE /api/engage/kudos/:id — quien lo dio o Administrador
async function removeKudos(req, res) {
  const kudosId = Number(req.params.id);
  if (!Number.isInteger(kudosId)) {
    return res.status(400).json({ error: "Reconocimiento inválido." });
  }

  const user = req.session.user;
  const result = await engageModel.deleteKudos(user.id, isAdmin(user), kudosId);
  if (!result.ok) return res.status(403).json({ error: result.error });

  const kudos = await engageModel.getKudos();
  res.json({ kudos: kudosFor(kudos, user) });
}

// POST /api/engage/surveys/:id/vote
async function vote(req, res) {
  const surveyId = Number(req.params.id);
  if (!Number.isInteger(surveyId)) {
    return res.status(400).json({ error: "Encuesta inválida." });
  }

  const rawOptionId = req.body && req.body.optionId;
  const optionId = rawOptionId === undefined || rawOptionId === null ? null : Number(rawOptionId);
  if (optionId !== null && !Number.isInteger(optionId)) {
    return res.status(400).json({ error: "Opción inválida." });
  }

  const result = await engageModel.castVote(req.session.user.id, surveyId, optionId);
  if (!result.ok) return res.status(409).json({ error: result.error });

  const surveys = await engageModel.getSurveys(req.session.user.id);
  res.json({ surveys });
}

module.exports = {
  index,
  vote,
  createPost,
  addComment,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  createKudos,
  removeKudos,
};
