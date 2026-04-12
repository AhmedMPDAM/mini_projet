// server/models/LeaveRequest.js
// Mongoose schema for leave requests with enum types and statuses
// =========================================================

const mongoose = require('mongoose');

// =============================================================
// Leave type definitions with annual allowances (in business days)
// Adjust these values according to your company's leave policy.
// =============================================================
const LEAVE_TYPES = {
  annual: { label: 'Annual Leave', maxDays: 25 },
  sick: { label: 'Sick Leave', maxDays: 12 },
  maternity: { label: 'Maternity Leave', maxDays: 90 },
  paternity: { label: 'Paternity Leave', maxDays: 15 },
  unpaid: { label: 'Unpaid Leave', maxDays: 30 },
  bereavement: { label: 'Bereavement Leave', maxDays: 5 },
  marriage: { label: 'Marriage Leave', maxDays: 4 },
  other: { label: 'Other', maxDays: 10 },
};

const LEAVE_STATUS = ['pending', 'approved', 'rejected', 'cancelled', 'modification_requested'];

const leaveRequestSchema = new mongoose.Schema(
  {
    // Reference to the requesting user
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee reference is required'],
      index: true,
    },

    // Leave type – must be one of the predefined enum values
    leaveType: {
      type: String,
      required: [true, 'Leave type is required'],
      enum: {
        values: Object.keys(LEAVE_TYPES),
        message: '{VALUE} is not a valid leave type',
      },
    },

    // Date range
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      // VALIDATION: End date must be on or after start date
      validate: {
        validator: function (value) {
          return value >= this.startDate;
        },
        message: 'End date must be on or after start date',
      },
    },

    // Calculated number of business days (excludes weekends)
    // This is computed server-side and not user-editable
    businessDays: {
      type: Number,
      required: true,
      min: [1, 'Leave request must be at least 1 business day'],
    },

    // Optional reason/justification text
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
      default: '',
    },

    // Supporting document (PDF or image, max 5MB)
    attachment: {
      filename: { type: String },      // Original filename
      path: { type: String },          // Server storage path
      mimetype: { type: String },      // File MIME type
      size: { type: Number },          // File size in bytes
    },

    // Request status workflow
    status: {
      type: String,
      enum: {
        values: LEAVE_STATUS,
        message: '{VALUE} is not a valid status',
      },
      default: 'pending',
      index: true,
    },

    // Manager who approved/rejected (populated when status changes)
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Manager's comment when approving/rejecting
    reviewComment: {
      type: String,
      trim: true,
      maxlength: [300, 'Review comment cannot exceed 300 characters'],
      default: '',
    },

    // Timestamp of the review decision
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

// =============================================================
// Indexes for common query patterns
// =============================================================
leaveRequestSchema.index({ employee: 1, status: 1 });
leaveRequestSchema.index({ employee: 1, leaveType: 1, startDate: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });

// =============================================================
// Virtual: human-readable leave type label
// =============================================================
leaveRequestSchema.virtual('leaveTypeLabel').get(function () {
  return LEAVE_TYPES[this.leaveType]?.label || this.leaveType;
});

// Include virtuals when converting to JSON
leaveRequestSchema.set('toJSON', { virtuals: true });
leaveRequestSchema.set('toObject', { virtuals: true });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

module.exports = { LeaveRequest, LEAVE_TYPES, LEAVE_STATUS };
