const engageModel = require("../models/engageModel");

// GET /api/engage — feed, encuestas, aplausos, cumpleaños y posts del día.
async function index(req, res) {
  const userId = req.session.user.id;
  const [feed, surveys, kudos, birthdays, posts] = await Promise.all([
    engageModel.getFeed(),
    engageModel.getSurveys(userId),
    engageModel.getKudos(),
    engageModel.getBirthdaysToday(),
    engageModel.getPosts(),
  ]);

  res.json({
    feed,
    announcement: feed[0] || null,
    surveys,
    kudos,
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
