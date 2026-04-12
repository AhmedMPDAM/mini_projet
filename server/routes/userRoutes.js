// server/routes/userRoutes.js
// Express router for user administration endpoints
// =========================================================

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole');
const {
  getUsers,
  updateUserRole,
  toggleUserStatus,
} = require('../controllers/adminController');

// All endpoints in this router require a valid token AND 'admin' privileges
router.use(verifyToken);
router.use(checkRole(['admin']));

// GET /api/users
// Fetch all users with pagination
router.get('/', getUsers);

// PATCH /api/users/:id/role
// Update user's role
router.patch('/:id/role', updateUserRole);

// PATCH /api/users/:id/status
// Activate or deactivate an account
router.patch('/:id/status', toggleUserStatus);

module.exports = router;
