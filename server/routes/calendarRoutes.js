// server/routes/calendarRoutes.js
// Express router for team calendar endpoints
// =========================================================

const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const { getTeamCalendarEvents } = require('../controllers/calendarController');

// All endpoints require authentication and manager/admin role
router.use(verifyToken);
router.use(authorizeRoles('manager', 'admin'));

// GET /api/calendar/team-calendar
// Returns formatted FullCalendar events + dynamically generated color legend
router.get('/team-calendar', getTeamCalendarEvents);

module.exports = router;
