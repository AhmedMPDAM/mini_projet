// server/models/AuditLog.js
// Mongoose schema for the tracking timeline / audit trail
// =========================================================

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveRequest',
      required: true,
      index: true, // optimize queries fetching timelines
    },
    event: {
      type: String,
      required: true,
      // Status lifecycle + generic creation
      enum: ['created', 'pending', 'approved', 'rejected', 'modification_requested', 'cancelled'],
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // We cache the actor details to ensure the timeline remains
    // fully readable historically even if a user account is deleted later
    actorName: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false }, // Use timestamp explicitly mapping to createdAt
  }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
