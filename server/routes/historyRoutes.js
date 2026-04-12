// server/routes/historyRoutes.js
// Express router for Timeline histories
// =========================================================

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams so we can grab /:id
const { verifyToken } = require('../middleware/authMiddleware');
const { getRequestHistory } = require('../controllers/historyController');

// All history routes require authentication
router.use(verifyToken);

// GET /api/leave-requests/:id/history
// Returns sorted AuditLogs mapped to a specific leave request
router.get('/', getRequestHistory);

module.exports = router;
