// server/utils/conflictDetector.js
// Utility to detect overlapping leave requests in a given date range
// =========================================================

/**
 * Checks for date overlaps among an array of leave requests.
 * @param {Array} requests - Array of mongoose LeaveRequest documents / objects.
 * @returns {Set} - A Set of request IDs that have at least one overlap.
 */
const detectConflicts = (requests) => {
  const conflictIds = new Set();
  const activeRequests = requests.filter(
    (req) => req.status === 'approved' || req.status === 'pending'
  );

  // Compare every request against every other request
  for (let i = 0; i < activeRequests.length; i++) {
    for (let j = i + 1; j < activeRequests.length; j++) {
      const reqA = activeRequests[i];
      const reqB = activeRequests[j];

      const startA = new Date(reqA.startDate).getTime();
      const endA = new Date(reqA.endDate).getTime();
      const startB = new Date(reqB.startDate).getTime();
      const endB = new Date(reqB.endDate).getTime();

      // Check for overlap: start of A is before or at the end of B, 
      // AND end of A is after or at the start of B.
      if (startA <= endB && endA >= startB) {
        // Overlap detected! Both requests are part of a conflict block.
        conflictIds.add(reqA._id.toString());
        conflictIds.add(reqB._id.toString());
      }
    }
  }

  return conflictIds;
};

// =========================================================
// Deterministic Color Assignment Palette (10 colors)
// =========================================================
const EMPLOYEE_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#0ea5e9', // Sky Blue
  '#64748b', // Slate
];

/**
 * Deterministically assigns a stable color from the palette to a user ID.
 * @param {string} userId - The mongoose ObjectId as a hex string.
 * @returns {string} - A hex color code.
 */
const getColorForEmployee = (userId) => {
  // Simple hash of the ID string
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Make it positive and wrap via modulo
  const index = Math.abs(hash) % EMPLOYEE_COLORS.length;
  return EMPLOYEE_COLORS[index];
};

module.exports = {
  detectConflicts,
  getColorForEmployee,
  EMPLOYEE_COLORS,
};
