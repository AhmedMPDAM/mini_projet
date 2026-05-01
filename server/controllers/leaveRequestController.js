// server/controllers/leaveRequestController.js
// Business logic for leave request CRUD operations
// =========================================================

const { LeaveRequest, LEAVE_TYPES } = require('../models/LeaveRequest');
const fs = require('fs');
const path = require('path');

// =============================================================
// Helper: Calculate the number of business days between two dates
// Excludes Saturdays and Sundays. Both start and end dates are
// inclusive in the count.
// =============================================================
const calculateBusinessDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  // Normalize to midnight to avoid timezone edge cases
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday – skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

// =============================================================
// Helper: Calculate remaining leave balance for a specific type
// Returns: { used, max, remaining }
// =============================================================
const calculateLeaveBalance = async (employeeId, leaveType, year) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  // Sum all approved (or pending) business days for this leave type this year
  const result = await LeaveRequest.aggregate([
    {
      $match: {
        employee: employeeId,
        leaveType,
        status: { $in: ['approved', 'pending'] },
        startDate: { $gte: startOfYear, $lte: endOfYear },
      },
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: '$businessDays' },
      },
    },
  ]);

  const used = result.length > 0 ? result[0].totalDays : 0;
  const max = LEAVE_TYPES[leaveType]?.maxDays || 0;
  const remaining = max - used;

  return { used, max, remaining };
};

// =============================================================
// POST /api/leave-requests
// Create a new leave request with optional file attachment
// =============================================================
const createLeaveRequest = async (req, res) => {
  try {
    const { startDate, endDate, leaveType, reason } = req.body;
    const employeeId = req.user.userId;

    // ----- Server-side validation -----

    if (!startDate || !endDate || !leaveType) {
      return res.status(400).json({
        success: false,
        message: 'Start date, end date, and leave type are required.',
      });
    }

    // Validate leave type
    if (!LEAVE_TYPES[leaveType]) {
      return res.status(400).json({
        success: false,
        message: `Invalid leave type. Allowed: ${Object.keys(LEAVE_TYPES).join(', ')}`,
      });
    }

    // Parse and validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD).',
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be on or after start date.',
      });
    }

    // VALIDATION: Prevent requests for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past.',
      });
    }

    // Calculate business days (excluding weekends)
    const businessDays = calculateBusinessDays(start, end);

    if (businessDays === 0) {
      return res.status(400).json({
        success: false,
        message:
          'The selected date range contains no business days. Weekends are excluded.',
      });
    }

    // VALIDATION: Check remaining leave balance
    const year = start.getFullYear();
    const balance = await calculateLeaveBalance(employeeId, leaveType, year);

    if (businessDays > balance.remaining) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. You are requesting ${businessDays} day(s) but only have ${balance.remaining} day(s) remaining for ${LEAVE_TYPES[leaveType].label} in ${year}.`,
        data: {
          requested: businessDays,
          remaining: balance.remaining,
          used: balance.used,
          max: balance.max,
        },
      });
    }

    // VALIDATION: Check for overlapping leave requests
    const overlapping = await LeaveRequest.findOne({
      employee: employeeId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message:
          'You already have a leave request that overlaps with these dates.',
        data: {
          conflictingRequest: {
            id: overlapping._id,
            startDate: overlapping.startDate,
            endDate: overlapping.endDate,
            status: overlapping.status,
          },
        },
      });
    }

    // Build the leave request object
    const leaveRequestData = {
      employee: employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      businessDays,
      reason: reason?.trim() || '',
    };

    // Attach file metadata if an attachment was uploaded
    if (req.file) {
      leaveRequestData.attachment = {
        filename: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };
    }

    const leaveRequest = await LeaveRequest.create(leaveRequestData);

    // Populate employee info for the response
    await leaveRequest.populate('employee', 'firstName lastName email');

    // Inject the ID into req so the native auditMiddleware can spawn the background log
    req._auditTargetId = leaveRequest._id;

    // =========================================================
    // MAKE.COM AUTOMATION TRIGGER
    // Send data to the Make.com webhook without blocking the response
    // =========================================================
    fetch(process.env.MAKE_COM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeName: `${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName}`,
        employeeEmail: leaveRequest.employee.email,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        businessDays: leaveRequest.businessDays,
        reason: leaveRequest.reason
      })
    }).catch(err => console.error('Make.com webhook failed:', err));

    return res.status(201).json({
      success: true,
      message: `Leave request created successfully. ${businessDays} business day(s) requested.`,
      data: {
        leaveRequest,
        balance: {
          used: balance.used + businessDays,
          max: balance.max,
          remaining: balance.remaining - businessDays,
        },
      },
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // Ignore cleanup errors
      }
    }

    console.error('Create leave request error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// GET /api/leave-requests
// List leave requests for the authenticated user
// Managers/admins can see all requests
// =============================================================
const getLeaveRequests = async (req, res) => {
  try {
    const { role, userId } = req.user;
    const { status, leaveType, page = 1, limit = 10 } = req.query;

    const filter = {};

    // Employees can only see their own requests
    if (role === 'employee') {
      filter.employee = userId;
    }

    // Optional filters
    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await LeaveRequest.countDocuments(filter);

    const leaveRequests = await LeaveRequest.find(filter)
      .populate('employee', 'firstName lastName email role')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      data: {
        leaveRequests,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// GET /api/leave-requests/balance
// Get the leave balance for the current user (all types)
// =============================================================
const getLeaveBalanceHandler = async (req, res) => {
  try {
    const { userId } = req.user;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const balances = {};

    for (const [type, config] of Object.entries(LEAVE_TYPES)) {
      const balance = await calculateLeaveBalance(userId, type, year);
      balances[type] = {
        label: config.label,
        ...balance,
      };
    }

    return res.status(200).json({
      success: true,
      data: { year, balances },
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// GET /api/leave-requests/:id
// Get a specific leave request by ID
// =============================================================
const getLeaveRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;

    const leaveRequest = await LeaveRequest.findById(id)
      .populate('employee', 'firstName lastName email role')
      .populate('reviewedBy', 'firstName lastName');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.',
      });
    }

    // Employees can only view their own requests
    if (role === 'employee' && leaveRequest.employee._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this request.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { leaveRequest },
    });
  } catch (error) {
    console.error('Get leave request error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// PATCH /api/leave-requests/:id/cancel
// Cancel a pending leave request (by the employee)
// =============================================================
const cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.',
      });
    }

    // Only the request owner can cancel
    if (leaveRequest.employee.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own requests.',
      });
    }

    // Only pending requests can be cancelled
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a request with status "${leaveRequest.status}". Only pending requests can be cancelled.`,
      });
    }

    leaveRequest.status = 'cancelled';
    await leaveRequest.save();

    return res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully.',
      data: { leaveRequest },
    });
  } catch (error) {
    console.error('Cancel leave request error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// PATCH /api/leave-requests/:id/review
// Approve or reject a leave request (manager/admin only)
// =============================================================
const reviewLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const { userId } = req.user;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be "approved" or "rejected".',
      });
    }

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.',
      });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot review a request with status "${leaveRequest.status}". Only pending requests can be reviewed.`,
      });
    }

    leaveRequest.status = status;
    leaveRequest.reviewedBy = userId;
    leaveRequest.reviewComment = comment?.trim() || '';
    leaveRequest.reviewedAt = new Date();
    await leaveRequest.save();

    await leaveRequest.populate('employee', 'firstName lastName email');
    await leaveRequest.populate('reviewedBy', 'firstName lastName');

    return res.status(200).json({
      success: true,
      message: `Leave request ${status} successfully.`,
      data: { leaveRequest },
    });
  } catch (error) {
    console.error('Review leave request error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// GET /api/leave-requests/types
// Return all available leave types with their max allowances
// =============================================================
const getLeaveTypes = (req, res) => {
  const types = Object.entries(LEAVE_TYPES).map(([value, config]) => ({
    value,
    label: config.label,
    maxDays: config.maxDays,
  }));

  return res.status(200).json({
    success: true,
    data: { types },
  });
};

module.exports = {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestById,
  getLeaveBalance: getLeaveBalanceHandler,
  cancelLeaveRequest,
  reviewLeaveRequest,
  getLeaveTypes,
  calculateBusinessDays,
};
