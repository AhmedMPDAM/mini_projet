// server/middleware/authMiddleware.js
// JWT verification middleware for protecting routes
// =========================================================
// This middleware extracts the JWT from the Authorization header,
// verifies its signature, and attaches the decoded user payload
// to req.user for downstream handlers.
// =========================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// =============================================================
// verifyToken – Authenticates the request via Bearer token
// =============================================================
const verifyToken = async (req, res, next) => {
  try {
    // SECURITY: Extract the token from the Authorization header.
    // Expected format: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Malformed authorization header.',
      });
    }

    // SECURITY: jwt.verify will throw if the token is expired,
    // has an invalid signature, or is otherwise malformed.
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Verify the user still exists and is active in the database,
    // preventing use of tokens for deleted/deactivated accounts.
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Contact an administrator.',
      });
    }

    // Attach user data to the request object for downstream middleware/routes
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    // SECURITY: Differentiate between expired and invalid tokens
    // so the client can decide whether to attempt a refresh.
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'TOKEN_INVALID',
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

// =============================================================
// authorizeRoles – Role-based access control middleware factory
// Usage: authorizeRoles('admin', 'manager')
// =============================================================
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

module.exports = { verifyToken, authorizeRoles };
