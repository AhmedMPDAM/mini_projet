// server/routes/notificationRoutes.js
// Express router for notification endpoints
// =========================================================

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/leaveValidationController');

// All routes require authentication
router.use(verifyToken);

// GET /api/notifications
// Get the current user's notifications (supports ?unreadOnly=true)
router.get('/', getNotifications);

// PATCH /api/notifications/read-all
// Mark all notifications as read (must be BEFORE /:id/read)
router.patch('/read-all', markAllNotificationsRead);

// PATCH /api/notifications/:id/read
// Mark a single notification as read
router.patch('/:id/read', markNotificationRead);

module.exports = router;
