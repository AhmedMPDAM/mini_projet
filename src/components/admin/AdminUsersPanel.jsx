// src/components/admin/AdminUsersPanel.jsx
// Admin interface for managing users (Roles & Status)
// =========================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import RoleSelect from './RoleSelect';
import './AdminUsersPanel.css';

const AdminUsersPanel = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth(); // Needed to prevent self-modifications

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Confirmation Modal
  const [modal, setModal] = useState({
    isOpen: false,
    user: null, // User reference
  });

  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  // =============================================================
  // Fetch Users
  // =============================================================
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data } = await api.get('/users', {
        params: { page, search },
      });

      setUsers(data.data.users);
      setTotalPages(data.data.pagination.pages);
    } catch (err) {
      console.error('Fetch users error', err);
      setError('Failed to load users. Are you an admin?');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    // Debounce search slightly to avoid spamming the endpoint while typing
    const delay = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(delay);
  }, [fetchUsers]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000);
  };

  // =============================================================
  // Role Modification
  // =============================================================
  const handleRoleChange = async (userId, newRole) => {
    try {
      const { data } = await api.patch(`/users/${userId}/role`, { role: newRole });
      
      // Update local state instead of refetching the whole list
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      
      showToast(`User role updated to ${newRole}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update role';
      showToast(msg, 'error');
    }
  };

  // =============================================================
  // Status Toggling (with Modal Confirmation)
  // =============================================================
  const requestStatusToggle = (user) => {
    // Current user cannot deactivate themselves
    if (user._id === currentUser._id && user.isActive) {
      showToast("Security: You cannot deactivate your own admin account.", 'error');
      return;
    }
    
    // If activating an account, we don't necessarily need a severe warning format,
    // but the same modal handles both.
    setModal({ isOpen: true, user });
  };

  const confirmStatusToggle = async () => {
    if (!modal.user) return;
    const { _id: userId, isActive: currentlyActive } = modal.user;
    const newStatus = !currentlyActive;

    try {
      setModal({ isOpen: false, user: null });
      const { data } = await api.patch(`/users/${userId}/status`, { isActive: newStatus });
      
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isActive: newStatus } : u))
      );
      
      showToast(`Account successfully ${newStatus ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update status';
      showToast(msg, 'error');
    }
  };

  // =============================================================
  // Render
  // =============================================================
  return (
    <div className="admin-panel">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-left">
            <h1>User Management</h1>
            <p>Admin panel to handle roles and account status.</p>
          </div>
          <div className="admin-header-right">
            <button className="btn-outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#991b1b', color: '#fecaca', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="admin-filters">
          <div className="admin-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // Reset page on search
              }}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading Skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton-box" style={{ width: '80%' }}></div></td>
                    <td><div className="skeleton-box" style={{ width: '60%' }}></div></td>
                    <td><div className="skeleton-box" style={{ width: '40%' }}></div></td>
                    <td><div className="skeleton-box" style={{ width: '50%' }}></div></td>
                    <td><div className="skeleton-box" style={{ width: '100px', float: 'right' }}></div></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = user._id === currentUser._id;
                  
                  return (
                    <tr key={user._id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="user-name">{user.firstName} {user.lastName} {isSelf && '(You)'}</div>
                            <div className="user-email">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <RoleSelect 
                          currentRole={user.role} 
                          onChange={(newRole) => handleRoleChange(user._id, newRole)}
                          disabled={isSelf} // Cannot change own role
                        />
                      </td>
                      <td>
                        <div className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                          <div className="status-dot"></div>
                          {user.isActive ? 'Active' : 'Deactivated'}
                        </div>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '13px' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="action-cell" style={{ textAlign: 'right' }}>
                        <button
                          className={`btn-toggle-status ${user.isActive ? 'deactivate' : 'activate'}`}
                          onClick={() => requestStatusToggle(user)}
                          disabled={isSelf} // Cannot deactivate self
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </button>
            <div className="page-info">
              Page {page} of {totalPages}
            </div>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modal.isOpen && modal.user && (
        <div className="modal-overlay">
          <div className="modal-card admin-modal-card">
            <h2>{modal.user.isActive ? 'Deactivate Account?' : 'Activate Account?'}</h2>
            <p>
              Are you sure you want to {modal.user.isActive ? 'deactivate' : 'activate'} the account for <strong>{modal.user.email}</strong>?
              <br/><br/>
              {modal.user.isActive 
                ? "They will immediately lose access to the system and all active sessions will be invalidated."
                : "They will be able to log in and use the system again."}
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button
                className="btn-cancel"
                onClick={() => setModal({ isOpen: false, user: null })}
              >
                Cancel
              </button>
              <button
                className={`btn-confirm ${modal.user.isActive ? 'confirm-reject' : 'confirm-modify'}`}
                onClick={confirmStatusToggle}
              >
                Yes, {modal.user.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className={`toast ${toast.type}`} style={{ position: 'fixed', bottom: 24, right: 24, padding: '14px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500, zIndex: 3000, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', color: toast.type === 'error' ? '#fecaca' : '#bbf7d0', background: toast.type === 'error' ? '#991b1b' : '#166534', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminUsersPanel;
