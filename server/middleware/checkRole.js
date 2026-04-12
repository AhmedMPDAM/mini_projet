// server/middleware/checkRole.js
// Reusable Role-Based Access Control (RBAC) middleware
// =========================================================

/**
 * Middleware that restricts route access to specific user roles.
 * Must be used AFTER the verifyToken middleware.
 * 
 * @param {Array<string>} allowedRoles - Array of roles permitted to access the route.
 * @returns {Function} Express middleware function
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure the request has been authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Missing user context.',
      });
    }

    // Check if the user's role is in the list of allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Required role(s): ${allowedRoles.join(', ')}.`,
      });
    }

    // User is authorized
    next();
  };
};

module.exports = checkRole;
