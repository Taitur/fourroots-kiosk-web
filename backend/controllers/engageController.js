const engageModel = require("../models/engageModel");

// GET /api/engage — feed, encuestas, aplausos y cumpleaños del día.
async function index(req, res) {
  const userId = req.session.user.id;
  const [feed, surveys, kudos, birthdays] = await Promise.all([
    engageModel.getFeed(),
    engageModel.getSurveys(userId),
    engageModel.getKudos(),
    engageModel.getBirthdaysToday(),
  ]);

  res.json({
    feed,
    announcement: feed[0] || null,
    surveys,
    kudos,
    birthdays,
  });
}

module.exports = { index };
