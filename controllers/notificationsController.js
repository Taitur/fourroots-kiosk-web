const notificationModel = require("../models/notificationModel");

// GET /api/notifications
async function list(req, res) {
  res.json(await notificationModel.getForUser(req.session.user.id));
}

// PATCH /api/notifications/:id/read
async function markRead(req, res) {
  const updated = await notificationModel.markRead(req.session.user.id, req.params.id);
  res.sendStatus(updated ? 200 : 404);
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res) {
  await notificationModel.markAllRead(req.session.user.id);
  res.sendStatus(200);
}

module.exports = { list, markRead, markAllRead };
