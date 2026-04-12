// server/controllers/leaveValidationController.js
// Manager leave request validation logic with employee notifications
// =========================================================
// Handles status transitions: pending → approved | rejected | modification_requested
// Each action creates an in-app notification for the employee.
// =========================================================

const { LeaveRequest, LEAVE_TYPES } = require('../models/LeaveRequest');
const Notification = require('../models/Notification');

// =============================================================
// NOTIFICATION: Status-specific notification templates
// =============================================================
const NOTIFICATION_TEMPLATES = {
  approved: {
    type: 'leave_approved',
    title: 'Leave Request Approved ✅',
    message: (req, reviewer) =>
      `Your ${LEAVE_TYPES[req.leaveType]?.label || req.leaveType} request (${formatDateRange(req)}) has been approved by ${reviewer}.${req.reviewComment ? ` Comment: "${req.reviewComment}"` : ''}`,
  },
  rejected: {
    type: 'leave_rejected',
    title: 'Leave Request Rejected ❌',
    message: (req, reviewer) =>
      `Your ${LEAVE_TYPES[req.leaveType]?.label || req.leaveType} request (${formatDateRange(req)}) has been rejected by ${reviewer}. Reason: "${req.reviewComment}"`,
  },
  modification_requested: {
    type: 'leave_modification_requested',
    title: 'Modification Requested ✏️',
    message: (req, reviewer) =>
      `${reviewer} has requested modifications to your ${LEAVE_TYPES[req.leaveType]?.label || req.leaveType} request (${formatDateRange(req)}). Comment: "${req.reviewComment}"`,
  },
};

// Helper: format date range for notification message
const formatDateRange = (leaveReq) => {
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };
  const start = new Date(leaveReq.startDate).toLocaleDateString('en-GB', opts);
  const end = new Date(leaveReq.endDate).toLocaleDateString('en-GB', opts);
  return start === end ? start : `${start} – ${end}`;
};

// =============================================================
// PATCH /api/leave-requests/:id/status
// Change leave request status (manager/admin only)
// Accepts: approved, rejected, modification_requested
// =============================================================
const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const { userId, firstName, lastName } = req.user;
    const reviewerName = `${firstName} ${lastName}`;

    // ----- Validate the requested status -----
    const allowedStatuses = ['approved', 'rejected', 'modification_requested'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`,
      });
    }

    // VALIDATION: Rejection and modification_requested require a comment
    if (['rejected', 'modification_requested'].includes(status)) {
      if (!comment || !comment.trim()) {
        return res.status(400).json({
          success: false,
          message: `A comment is required when ${status === 'rejected' ? 'rejecting' : 'requesting modifications for'} a leave request.`,
        });
      }
    }

    // ----- Fetch the leave request -----
    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.',
      });
    }

    // VALIDATION: Only pending or modification_requested requests can be reviewed
    const reviewableStatuses = ['pending', 'modification_requested'];
    if (!reviewableStatuses.includes(leaveRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of a "${leaveRequest.status}" request. Only pending or modification-requested requests can be reviewed.`,
      });
    }

    // ----- Update the leave request -----
    leaveRequest.status = status;
    leaveRequest.reviewedBy = userId;
    leaveRequest.reviewComment = comment?.trim() || '';
    leaveRequest.reviewedAt = new Date();
    await leaveRequest.save();

    // Populate references for the response
    await leaveRequest.populate('employee', 'firstName lastName email');
    await leaveRequest.populate('reviewedBy', 'firstName lastName');

    // ----- Create notification for the employee -----
    const template = NOTIFICATION_TEMPLATES[status];
    if (template) {
      try {
        await Notification.create({
          recipient: leaveRequest.employee._id,
          type: template.type,
          title: template.title,
          message: template.message(leaveRequest, reviewerName),
          leaveRequest: leaveRequest._id,
        });
      } catch (notifError) {
        // Log but don't fail the main operation if notification fails
        console.error('Failed to create notification:', notifError);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Leave request status updated to "${status}" successfully.`,
      data: { leaveRequest },
    });
  } catch (error) {
    console.error('Update leave status error:', error);

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
// GET /api/leave-requests/team
// Get all leave requests for the manager's team with filters
// Supports: status, employee, dateFrom, dateTo, leaveType, page, limit
// =============================================================
const getTeamLeaveRequests = async (req, res) => {
  try {
    const {
      status,
      employee,
      dateFrom,
      dateTo,
      leaveType,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};

    // Filter by status (supports comma-separated values: "pending,approved")
    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      filter.status = { $in: statuses };
    }

    // Filter by specific employee
    if (employee) {
      filter.employee = employee;
    }

    // Filter by leave type
    if (leaveType) {
      filter.leaveType = leaveType;
    }

    // Filter by date range (requests that overlap with the given period)
    if (dateFrom || dateTo) {
      if (dateFrom) {
        filter.endDate = { $gte: new Date(dateFrom) };
      }
      if (dateTo) {
        filter.startDate = { ...filter.startDate, $lte: new Date(dateTo) };
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Count documents for pagination
    const total = await LeaveRequest.countDocuments(filter);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch leave requests with populated references
    const leaveRequests = await LeaveRequest.find(filter)
      .populate('employee', 'firstName lastName email role')
      .populate('reviewedBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10));

    // Compute summary stats for the filters
    const stats = await LeaveRequest.aggregate([
      { $match: filter.employee ? { employee: filter.employee } : {} },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts = {};
    stats.forEach((s) => {
      statusCounts[s._id] = s.count;
    });

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
        statusCounts,
      },
    });
  } catch (error) {
    console.error('Get team leave requests error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// GET /api/notifications
// Get notifications for the authenticated user
// =============================================================
const getNotifications = async (req, res) => {
  try {
    const { userId } = req.user;
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const filter = { recipient: userId };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// PATCH /api/notifications/:id/read
// Mark a notification as read
// =============================================================
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { notification },
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// PATCH /api/notifications/read-all
// Mark all notifications as read for the current user
// =============================================================
const markAllNotificationsRead = async (req, res) => {
  try {
    const { userId } = req.user;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

module.exports = {
  updateLeaveStatus,
  getTeamLeaveRequests,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
