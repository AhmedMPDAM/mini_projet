// server/routes/leaveRequestRoutes.js
// Express router for leave request endpoints
// =========================================================

const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadAttachment } = require('../middleware/uploadMiddleware');
const {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestById,
  getLeaveBalance,
  cancelLeaveRequest,
  reviewLeaveRequest,
  getLeaveTypes,
} = require('../controllers/leaveRequestController');
const {
  updateLeaveStatus,
  getTeamLeaveRequests,
} = require('../controllers/leaveValidationController');
const auditLogTransaction = require('../middleware/auditMiddleware');
const historyRoutes = require('./historyRoutes');

// =============================================================
// All routes below require authentication
// =============================================================
router.use(verifyToken);

// Mount history routes 
router.use('/:id/history', historyRoutes);

// GET /api/leave-requests/types
// Returns available leave types with max allowances (public to all roles)
router.get('/types', getLeaveTypes);

// GET /api/leave-requests/balance
// Returns leave balance for the current user (all types for the year)
router.get('/balance', getLeaveBalance);

// GET /api/leave-requests/team
// Returns all team leave requests with filters (manager/admin only)
router.get(
  '/team',
  authorizeRoles('manager', 'admin'),
  getTeamLeaveRequests
);

// POST /api/leave-requests
// Create a new leave request with optional file attachment
// uploadAttachment runs Multer BEFORE the controller,
// so req.file is available if a file was sent.
router.post('/', uploadAttachment, auditLogTransaction('created'), createLeaveRequest);

// GET /api/leave-requests
// List leave requests (employees see their own; managers/admins see all)
router.get('/', getLeaveRequests);

// GET /api/leave-requests/:id
// Get a single leave request by its ID
router.get('/:id', getLeaveRequestById);

// PATCH /api/leave-requests/:id/cancel
// Cancel a pending request (employee only, own requests)
router.patch('/:id/cancel', auditLogTransaction('cancelled'), cancelLeaveRequest);

// PATCH /api/leave-requests/:id/status
// Update status: approved, rejected, or modification_requested (manager/admin)
router.patch(
  '/:id/status',
  authorizeRoles('manager', 'admin'),
  auditLogTransaction(),
  updateLeaveStatus
);

// PATCH /api/leave-requests/:id/review (legacy – kept for backwards compat)
// Approve or reject a pending request (manager or admin only)
router.patch(
  '/:id/review',
  authorizeRoles('manager', 'admin'),
  auditLogTransaction(),
  reviewLeaveRequest
);

module.exports = router;

