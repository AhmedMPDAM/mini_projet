// server/controllers/calendarController.js
// Provides format-ready calendar events for the team leave calendar
// =========================================================

const { LeaveRequest } = require('../models/LeaveRequest');
const { detectConflicts, getColorForEmployee } = require('../utils/conflictDetector');

// =============================================================
// GET /api/calendar/team-calendar
// Fetches leave requests optimized for FullCalendar consumption.
// Flags overlapping events using detectConflicts.
// Filter support: start, end (from FullCalendar view parameters), employee, status
// =============================================================
const getTeamCalendarEvents = async (req, res) => {
  try {
    const { start, end, employee, status } = req.query;

    const filter = {};

    // 1. Date window filtering (FullCalendar sends ISO start/end for the current view)
    if (start && end) {
      filter.$or = [
        // Event starts within the window
        { startDate: { $gte: new Date(start), $lte: new Date(end) } },
        // Event ends within the window
        { endDate: { $gte: new Date(start), $lte: new Date(end) } },
        // Event spans across the window entirely
        { startDate: { $lt: new Date(start) }, endDate: { $gt: new Date(end) } },
      ];
    } else if (start) {
      filter.endDate = { $gte: new Date(start) };
    } else if (end) {
      filter.startDate = { $lte: new Date(end) };
    }

    // 2. Employee filtering
    if (employee) {
      filter.employee = employee;
    }

    // 3. Status filtering (often calendar only shows approved/pending)
    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      filter.status = { $in: statuses };
    } else {
      // By default, showing cancelled or rejected leaves clutters the calendar,
      // so exclude them if no specific status is requested.
      filter.status = { $in: ['pending', 'approved', 'modification_requested'] };
    }

    // Fetch the data and populate employee heavily
    const leaveRequests = await LeaveRequest.find(filter)
      .populate('employee', 'firstName lastName email')
      .lean(); // Faster processing since we're just formatting

    // Compute conflicts (which ones overlap)
    const conflictIds = detectConflicts(leaveRequests);

    // Format into FullCalendar Event Object format
    const events = leaveRequests.map((req) => {
      // Need to construct an exclusive "end" date for FullCalendar.
      // FullCalendar's end date is EXCLUSIVE for all-day events.
      // So if someone takes leave until Nov 5, we must pass Nov 6.
      const exclusiveEndDate = new Date(req.endDate);
      exclusiveEndDate.setDate(exclusiveEndDate.getDate() + 1);

      const color = getColorForEmployee(req.employee._id);
      const isConflict = conflictIds.has(req._id.toString());

      return {
        id: req._id,
        // E.g., "John Doe - Annual Leave"
        title: `${req.employee.firstName} ${req.employee.lastName} (${req.leaveTypeLabel || req.leaveType})`,
        start: req.startDate,
        end: exclusiveEndDate.toISOString(), // FullCalendar exclusive boundary
        allDay: true, // Leave requests are full business days in this domain
        backgroundColor: color,
        borderColor: isConflict ? '#ef4444' : color, // Outline in red if conflict
        textColor: '#ffffff',
        // Attach extended props for the custom render in frontend
        extendedProps: {
          employeeId: req.employee._id,
          firstName: req.employee.firstName,
          lastName: req.employee.lastName,
          email: req.employee.email,
          leaveType: req.leaveType,
          status: req.status,
          businessDays: req.businessDays,
          isConflict,
        },
      };
    });

    // Build the legend payload to show employee mapping dynamically
    const legendMap = new Map();
    leaveRequests.forEach((req) => {
      const empIdStr = req.employee._id.toString();
      if (!legendMap.has(empIdStr)) {
        legendMap.set(empIdStr, {
          id: empIdStr,
          name: `${req.employee.firstName} ${req.employee.lastName}`,
          color: getColorForEmployee(req.employee._id),
        });
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        events,
        legend: Array.from(legendMap.values()),
      },
    });
  } catch (error) {
    console.error('Calendar events error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar events.',
    });
  }
};

module.exports = {
  getTeamCalendarEvents,
};
