// server/routes/authRoutes.js
// Express router for authentication endpoints
// =========================================================

const express = require('express');
const router = express.Router();
const {
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// =============================================================
// Public routes – no authentication required
// =============================================================

// POST /api/auth/login
// Body: { email: string, password: string }
// Returns: { user, accessToken } + sets refreshToken cookie
router.post('/login', login);

// POST /api/auth/forgot-password
// Body: { email: string }
// Returns: generic success message (prevents user enumeration)
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password/:token
// Body: { password: string, confirmPassword: string }
// Returns: success message
router.post('/reset-password/:token', resetPassword);

// POST /api/auth/refresh-token
// Cookie: refreshToken (HttpOnly)
// Returns: { accessToken }
router.post('/refresh-token', refreshAccessToken);

// =============================================================
// Protected routes – require valid access token
// =============================================================

// POST /api/auth/logout
// Clears the refresh token cookie and invalidates the session
router.post('/logout', verifyToken, logout);

// GET /api/auth/me
// Returns the currently authenticated user's profile
router.get('/me', verifyToken, (req, res) => {
  return res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});

module.exports = router;
