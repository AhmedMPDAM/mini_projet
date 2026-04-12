// src/components/manager/RequestCard.jsx
// A UI component representing a single leave request in the manager dashboard
// =========================================================

import React, { useState } from 'react';
import { format } from 'date-fns';
import RequestTimeline from '../leave/RequestTimeline';

const RequestCard = ({
  request,
  onApprove,
  onReject,
  onModify,
  optimistic = false,
}) => {
  const {
    _id,
    employee,
    leaveTypeLabel,
    startDate,
    endDate,
    businessDays,
    status,
    reason,
    reviewComment,
    reviewedBy,
    createdAt,
  } = request;

  const [showTimeline, setShowTimeline] = useState(false);

  // Format dates securely
  const formatSafeDate = (isoString) => {
    if (!isoString) return '';
    try {
      return format(new Date(isoString), 'MMM dd, yyyy');
    } catch {
      return isoString; // fallback
    }
  };

  const isPending = status === 'pending' || status === 'modification_requested';

  return (
    <div className={`request-card ${optimistic ? 'optimistic' : ''}`}>
      {/* Top Row: Employee & Status */}
      <div className="card-top">
        <div className="employee-info">
          <div className="employee-avatar">
            {employee?.firstName?.charAt(0) || ''}
            {employee?.lastName?.charAt(0) || ''}
          </div>
          <div>
            <div className="employee-name">
              {employee?.firstName} {employee?.lastName}
            </div>
            <div className="employee-email">{employee?.email}</div>
          </div>
        </div>
        <div className={`status-badge ${status}`}>
          {status.replace('_', ' ')}
        </div>
      </div>

      {/* Details Row */}
      <div className="card-details">
        <div className="detail-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <strong>
            {formatSafeDate(startDate)}
            {startDate !== endDate ? ` – ${formatSafeDate(endDate)}` : ''}
          </strong>
        </div>
        <div className="detail-item tooltip-host">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="leave-type-badge">{leaveTypeLabel || request.leaveType}</span>
          <span style={{ marginLeft: 6 }}>
            ({businessDays} day{businessDays > 1 ? 's' : ''})
          </span>
        </div>
        <div className="detail-item" style={{ fontSize: 11, color: '#64748b' }}>
          Submitted: {formatSafeDate(createdAt)}
        </div>
      </div>

      {/* Reason block */}
      {reason && (
        <div className="card-reason">
          <div className="reason-label">Reason</div>
          <div>{reason}</div>
        </div>
      )}

      {/* Review block (if already reviewed) */}
      {!isPending && reviewComment && (
        <div className="review-info">
          <div className="reviewer">
            Reviewed by {reviewedBy?.firstName} {reviewedBy?.lastName}:
          </div>
          <div>"{reviewComment}"</div>
        </div>
      )}

      {/* Actions (only for pending/modification_requested) */}
      {isPending && (
        <div className="card-actions">
          <button
            className="action-btn approve"
            onClick={() => onApprove(_id)}
            disabled={optimistic}
            title="Approve immediately"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Approve
          </button>
          <button
            className="action-btn modify"
            onClick={() => onModify(_id)}
            disabled={optimistic}
            title="Request changes from employee"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Request Modification
          </button>
          <button
            className="action-btn reject"
            onClick={() => onReject(_id)}
            disabled={optimistic}
            title="Reject request"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Reject
          </button>
        </div>
      )}

      {/* Timeline Toggle & Display */}
      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px' }}>
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          style={{
            background: 'none',
            border: 'none',
            color: '#818cf8',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showTimeline ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {showTimeline ? 'Hide History & Audit Trail' : 'View History & Audit Trail'}
        </button>

        {showTimeline && (
          <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '16px' }}>
            <RequestTimeline requestId={_id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestCard;
