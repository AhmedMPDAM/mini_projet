// server/middleware/auditMiddleware.js
// Hooks into Express response stream to natively log events without controller edits
// =========================================================

const AuditLog = require('../models/AuditLog');

/**
 * Creates a passive audit trail logging middleware mapping to specific events.
 * Listens to the `finish` event on the response to log successfully processed requests.
 * @param {string} forcedEvent - If set to 'created', forces the event type. Otherwise uses req.body.status
 */
const auditLogTransaction = (forcedEvent = null) => {
  return (req, res, next) => {
    // We only attach to the 'finish' event to ensure the request actually succeeded
    // in the downstream controllers.
    res.on('finish', async () => {
      // 2xx indicates success
      if (res.statusCode >= 200 && res.statusCode < 300) {
        
        let targetId = req.params.id; // from PATCH /:id

        // If this is a POST (creation), the target ID is actually returned inside the 
        // response body by convention, but native `res` doesn't expose written payload easily.
        // As a workaround, we'll extract it from the native req object if the controller 
        // attaches it (We'll safely modify leaveRequestController to append `req.newLeaveRequestId`).
        // Alternatively, since we know it's a creation, the worker actor is the user.
        if (forcedEvent === 'created') {
           // We will rely on the controller injecting req._auditTargetId for generic tracking.
           targetId = targetId || req._auditTargetId; 
        }

        if (!targetId || !req.user) return; // Silent abort if no target or no session

        const eventName = forcedEvent || req.body.status;
        const comment = req.body.comment || req.body.reason || '';

        try {
          await AuditLog.create({
            leaveRequest: targetId,
            event: eventName,
            actorId: req.user.userId,
            actorName: `${req.user.firstName} ${req.user.lastName}`,
            actorRole: req.user.role,
            comment: comment.trim(),
          });
        } catch (err) {
          console.error('[AuditMiddleware] Failed to spawn audit log:', err);
        }
      }
    });

    next();
  };
};

module.exports = auditLogTransaction;
