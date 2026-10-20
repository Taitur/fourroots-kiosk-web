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

module.exports = { index, vote, createPost, addComment };
