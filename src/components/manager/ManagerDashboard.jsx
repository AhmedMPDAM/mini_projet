// src/components/manager/ManagerDashboard.jsx
// Main manager dashboard component with list, filters, and modals
// =========================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useLeaveRequests from '../../hooks/useLeaveRequests';
import useAuth from '../../hooks/useAuth';
import RequestCard from './RequestCard';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const {
    requests,
    loading,
    error,
    pagination,
    statusCounts,
    filters,
    updateFilters,
    updateStatus,
  } = useLeaveRequests();

  // Modal State
  const [modal, setModal] = useState({
    isOpen: false,
    requestId: null,
    action: null, // 'approved' | 'rejected' | 'modification_requested'
    comment: '',
    error: '',
  });

  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  // Notifications
  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000);
  };

  // =============================================================
  // Status Handlers
  // =============================================================
  const handleApprove = async (id) => {
    // Approve doesn't strictly need a comment, so we can do it directly or via a fast modal.
    // For safety, let's open modal with prompt just in case they want to add a comment, 
    // but they can submit it blank.
    setModal({
      isOpen: true,
      requestId: id,
      action: 'approved',
      comment: '',
      error: '',
    });
  };

  const handleReject = (id) => {
    setModal({
      isOpen: true,
      requestId: id,
      action: 'rejected',
      comment: '',
      error: '',
    });
  };

  const handleModify = (id) => {
    setModal({
      isOpen: true,
      requestId: id,
      action: 'modification_requested',
      comment: '',
      error: '',
    });
  };

  const submitModal = async () => {
    const { requestId, action, comment } = modal;

    if ((action === 'rejected' || action === 'modification_requested') && !comment.trim()) {
      setModal((prev) => ({ ...prev, error: 'A comment is required for this action.' }));
      return;
    }

    setModal((prev) => ({ ...prev, isOpen: false })); // close immediately for optimistic UI
    const result = await updateStatus(requestId, action, comment);

    if (result.success) {
      showToast(`Request ${action.replace('_', ' ')} successfully.`);
    } else {
      showToast(result.message, 'error');
    }
  };

  // =============================================================
  // Render
  // =============================================================
  return (
    <div className="manager-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-left">
            <h1>Team Leave Requests</h1>
            <p>Manage and review your team's absence requests</p>
          </div>
          <div className="header-actions">
            {currentUser?.role === 'admin' && (
              <button
                className="btn-outline"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}
                onClick={() => navigate('/admin/users')}
                title="Manage Users"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Manage Users
              </button>
            )}
            <button
              className="btn-outline"
              onClick={() => navigate('/team-calendar')}
              title="View Calendar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Calendar View
            </button>
            <button
              className="btn-outline"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Global Error */}
        {error && (
          <div style={{ background: '#991b1b', color: '#fecaca', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="status-tabs">
          {[
            { label: 'All', value: '' },
            { label: 'Pending', value: 'pending,modification_requested' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'Cancelled', value: 'cancelled' },
          ].map((tab) => {
            // Compute total for compound tabs
            let count = 0;
            if (tab.value === '') {
              count = Object.values(statusCounts).reduce((a, b) => a + b, 0);
            } else if (tab.value.includes(',')) {
              count = tab.value.split(',').reduce((a, b) => a + (statusCounts[b] || 0), 0);
            } else {
              count = statusCounts[tab.value] || 0;
            }

            return (
              <button
                key={tab.label}
                className={`status-tab ${filters.status === tab.value ? 'active' : ''}`}
                onClick={() => updateFilters({ status: tab.value })}
              >
                {tab.label}
                <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <select
            className="filter-select"
            value={filters.leaveType}
            onChange={(e) => updateFilters({ leaveType: e.target.value })}
          >
            <option value="">All Leave Types</option>
            <option value="annual">Annual Leave</option>
            <option value="sick">Sick Leave</option>
            <option value="maternity">Maternity Leave</option>
            <option value="paternity">Paternity Leave</option>
            <option value="unpaid">Unpaid Leave</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* List */}
        <div className="requests-grid">
          {loading && requests.length === 0 ? (
            // Skeleton loaders
            [1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-line medium" />
                <div className="skeleton-line short" />
                <div className="skeleton-line long" />
              </div>
            ))
          ) : requests.length > 0 ? (
            requests.map((req) => (
              <RequestCard
                key={req._id}
                request={req}
                optimistic={req._optimistic}
                onApprove={handleApprove}
                onReject={handleReject}
                onModify={handleModify}
              />
            ))
          ) : (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <h3>No requests found</h3>
              <p>Try adjusting your filters or check back later.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={pagination.page <= 1}
              onClick={() => updateFilters({ page: pagination.page - 1 })}
            >
              Previous
            </button>
            <span className="page-info">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              className="page-btn"
              disabled={pagination.page >= pagination.pages}
              onClick={() => updateFilters({ page: pagination.page + 1 })}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Confirm Action: {modal.action?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</h2>
            <p className="modal-subtitle">
              {modal.action === 'approved' 
                ? 'You are about to approve this request.' 
                : 'Please provide a reason for this decision.'}
            </p>
            <textarea
              placeholder="Leave a comment (mandatory for rejections/modifications)..."
              value={modal.comment}
              onChange={(e) => {
                setModal((prev) => ({ ...prev, comment: e.target.value, error: '' }));
              }}
              autoFocus
            />
            {modal.error && <div className="modal-error">{modal.error}</div>}
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setModal({ isOpen: false, requestId: null, action: null, comment: '', error: '' })}
              >
                Cancel
              </button>
              <button
                className={`btn-confirm ${modal.action === 'rejected' ? 'confirm-reject' : 'confirm-modify'}`}
                onClick={submitModal}
              >
                Confirm {modal.action === 'approved' ? 'Approval' : 'Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
