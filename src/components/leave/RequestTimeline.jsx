// src/components/leave/RequestTimeline.jsx
// Visual interface for the request audit trail
// =========================================================

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './RequestTimeline.css';

// SVG Icons based on event type
const getIconForEvent = (event) => {
  switch (event) {
    case 'created':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      );
    case 'approved':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'rejected':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'modification_requested':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case 'cancelled':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      );
    case 'pending':
    default:
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
  }
};

const formatEventTitle = (event, actorName) => {
  switch (event) {
    case 'created':
      return `Request submitted by ${actorName}`;
    case 'approved':
      return `Approved by ${actorName}`;
    case 'rejected':
      return `Rejected by ${actorName}`;
    case 'modification_requested':
      return `Modifications requested by ${actorName}`;
    case 'cancelled':
      return `Cancelled by ${actorName}`;
    case 'pending':
      return `Status reverted to pending by ${actorName}`;
    default:
      return `Status updated to ${event} by ${actorName}`;
  }
};

const RequestTimeline = ({ requestId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!requestId) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await api.get(`/leave-requests/${requestId}/history`);
        setLogs(data.data.logs);
      } catch (err) {
        console.error('Failed to load timeline:', err);
        setError('Failed to load request history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [requestId]);

  if (loading) {
    return (
      <div className="timeline-empty">
        <svg style={{ animation: 'pulse 1.5s infinite' }} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Loading timeline history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="timeline-empty" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No history available for this request yet.</p>
        <span style={{ fontSize: 12, opacity: 0.6 }}>Changes will appear here once processed.</span>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      {logs.map((log) => (
        <div key={log._id} className={`timeline-item event-${log.event}`}>
          <div className="timeline-visual">
            <div className="timeline-icon">
              {getIconForEvent(log.event)}
            </div>
            <div className="timeline-line"></div>
          </div>
          
          <div className="timeline-content">
            <div className="timeline-header">
              <div className="timeline-title">
                {formatEventTitle(log.event, log.actorName)}
                <span className="actor-role">{log.actorRole}</span>
              </div>
              <div className="timeline-timestamp">
                {new Intl.DateTimeFormat('en-GB', {
                  day: '2-digit', month: 'short', 
                  hour: '2-digit', minute: '2-digit'
                }).format(new Date(log.timestamp))}
              </div>
            </div>
            
            {log.comment && (
              <div className="timeline-comment">
                {/* Fallback reason mapping if creation event contains reason vs comment */}
                {log.comment.startsWith('Reason:') ? log.comment : `"${log.comment}"`}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RequestTimeline;
