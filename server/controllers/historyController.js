// server/controllers/historyController.js
// Responsible for retrieving the full chronological history trace of a request
// =========================================================

const AuditLog = require('../models/AuditLog');
const { LeaveRequest } = require('../models/LeaveRequest');

// =============================================================
// GET /api/leave-requests/:id/history
// Retrieves timeline logs. Managers/Admins can see any, Employees only their own.
// =============================================================
const getRequestHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // Fetch the target request to perform security validation
    const targetRequest = await LeaveRequest.findById(id);

    if (!targetRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.',
      });
    }

    // Role-Based Authorization
    // Employees can only see timelines of their own requests.
    if (role === 'employee' && targetRequest.employee.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to view this timeline.',
      });
    }

    // Fetch logs (descending by timestamp)
    const logs = await AuditLog.find({ leaveRequest: id })
      .sort({ timestamp: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { logs },
    });
  } catch (error) {
    console.error('Fetch history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve timeline history.',
    });
  }
};

module.exports = {
  getRequestHistory,
};
