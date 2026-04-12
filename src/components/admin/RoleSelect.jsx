// src/components/admin/RoleSelect.jsx
// Reusable dropdown component to assign roles to users
// =========================================================

import React from 'react';

const RoleSelect = ({ currentRole, onChange, disabled }) => {
  // Color coding by role
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return '#f43f5e'; // Rose
      case 'manager':
        return '#8b5cf6'; // Violet
      case 'employee':
      default:
        return '#6366f1'; // Indigo
    }
  };

  return (
    <div className="role-select-wrapper" style={{
      position: 'relative',
      display: 'inline-block',
      width: '130px',
    }}>
      <select
        value={currentRole}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        title={disabled ? "You cannot modify this role" : "Change user role"}
        style={{
          width: '100%',
          padding: '8px 30px 8px 14px',
          appearance: 'none',
          background: `rgba(255, 255, 255, 0.05)`,
          border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : getRoleColor(currentRole)}80`,
          borderRadius: '8px',
          color: disabled ? '#64748b' : '#f1f5f9',
          fontSize: '13px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <option value="employee" style={{ background: '#1e1e3a', color: '#f1f5f9' }}>Employee</option>
        <option value="manager" style={{ background: '#1e1e3a', color: '#f1f5f9' }}>Manager</option>
        <option value="admin" style={{ background: '#1e1e3a', color: '#f1f5f9' }}>Admin</option>
      </select>
      
      {/* Custom dropdown arrow */}
      <div style={{
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: disabled ? '#475569' : '#94a3b8',
      }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
};

export default RoleSelect;
