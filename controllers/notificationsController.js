const mockData = require("../models/mockDataModel");

// GET /api/notifications
function list(req, res) {
  res.json(mockData.getNotifications());
}

// PATCH /api/notifications/:id/read
function markRead(req, res) {
  if (!mockData.markNotificationRead(req.params.id)) return res.sendStatus(404);
  res.sendStatus(200);
}

// PATCH /api/notifications/read-all
function markAllRead(req, res) {
  mockData.markAllNotificationsRead();
  res.sendStatus(200);
}

module.exports = { list, markRead, markAllRead };
