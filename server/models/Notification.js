// server/models/Notification.js
// Mongoose schema for in-app notifications
// =========================================================

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // The user who receives the notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Notification type for frontend rendering
    type: {
      type: String,
      enum: [
        'leave_approved',
        'leave_rejected',
        'leave_modification_requested',
        'leave_cancelled',
        'leave_submitted',
      ],
      required: true,
    },

    // Human-readable notification title
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },

    // Notification body / details
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // Reference to the related leave request (for navigation)
    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveRequest',
      default: null,
    },

    // Read/unread status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fetching user's unread notifications efficiently
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
