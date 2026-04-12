// src/components/leave/LeaveRequestForm.jsx
// Leave request form with date picker, file upload, and client validation
// =========================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './LeaveRequestForm.css';

// =============================================================
// Helper: calculate business days between two dates (client-side)
// Mirrors the server-side logic for instant UI feedback.
// =============================================================
const calculateBusinessDays = (start, end) => {
  if (!start || !end) return 0;
  let count = 0;
  const current = new Date(start);
  const endDate = new Date(end);
  current.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

// Format file size to human-readable string
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// =============================================================
// LeaveRequestForm Component
// =============================================================
const LeaveRequestForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // --- Form state ---
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [leaveType, setLeaveType] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState(null);

  // --- UI state ---
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [dragover, setDragover] = useState(false);

  // --- Data from API ---
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState({});
  const [balancesLoading, setBalancesLoading] = useState(true);

  // --- Computed values ---
  const businessDays = calculateBusinessDays(startDate, endDate);
  const selectedBalance = leaveType ? balances[leaveType] : null;
  const isInsufficientBalance =
    selectedBalance && businessDays > (selectedBalance.remaining || 0);

  // =============================================================
  // Load leave types and balances on mount
  // =============================================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [typesRes, balanceRes] = await Promise.all([
          api.get('/leave-requests/types'),
          api.get('/leave-requests/balance'),
        ]);
        setLeaveTypes(typesRes.data.data.types);
        setBalances(balanceRes.data.data.balances);
      } catch (err) {
        console.error('Failed to load leave data:', err);
        setError('Failed to load leave types. Please refresh the page.');
      } finally {
        setBalancesLoading(false);
      }
    };
    fetchData();
  }, []);

  // =============================================================
  // Client-side validation
  // =============================================================
  const validate = useCallback(() => {
    const errors = {};

    if (!leaveType) {
      errors.leaveType = 'Please select a leave type.';
    }

    if (!startDate) {
      errors.startDate = 'Start date is required.';
    }

    if (!endDate) {
      errors.endDate = 'End date is required.';
    }

    if (startDate && endDate && endDate < startDate) {
      errors.endDate = 'End date must be on or after start date.';
    }

    if (startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        errors.startDate = 'Start date cannot be in the past.';
      }
    }

    if (businessDays === 0 && startDate && endDate) {
      errors.endDate = 'No business days in the selected range.';
    }

    // Check leave balance
    if (leaveType && selectedBalance && businessDays > 0) {
      if (businessDays > selectedBalance.remaining) {
        errors.leaveType = `Insufficient balance: ${selectedBalance.remaining} day(s) remaining, requesting ${businessDays}.`;
      }
    }

    // File validation
    if (attachment) {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];
      if (!allowedTypes.includes(attachment.type)) {
        errors.attachment = 'Only PDF, JPEG, PNG, and WebP files are accepted.';
      }
      if (attachment.size > 5 * 1024 * 1024) {
        errors.attachment = 'File size must not exceed 5MB.';
      }
    }

    if (reason && reason.length > 500) {
      errors.reason = 'Reason cannot exceed 500 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [leaveType, startDate, endDate, businessDays, selectedBalance, attachment, reason]);

  // =============================================================
  // Form submission
  // =============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validate()) return;

    setLoading(true);

    try {
      // Use FormData for multipart/form-data (file upload)
      const formData = new FormData();
      formData.append('leaveType', leaveType);
      formData.append('startDate', startDate.toISOString());
      formData.append('endDate', endDate.toISOString());
      if (reason.trim()) formData.append('reason', reason.trim());
      if (attachment) formData.append('attachment', attachment);

      const { data } = await api.post('/leave-requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(data.message);

      // Update local balance after successful submission
      if (data.data.balance && leaveType) {
        setBalances((prev) => ({
          ...prev,
          [leaveType]: {
            ...prev[leaveType],
            used: data.data.balance.used,
            remaining: data.data.balance.remaining,
          },
        }));
      }

      // Reset form
      setStartDate(null);
      setEndDate(null);
      setLeaveType('');
      setReason('');
      setAttachment(null);
      setFieldErrors({});
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Failed to submit leave request.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // =============================================================
  // File handling
  // =============================================================
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
      setFieldErrors((prev) => ({ ...prev, attachment: undefined }));
    }
  };

  const removeFile = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragover(true);
  };

  const handleDragLeave = () => setDragover(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setAttachment(file);
      setFieldErrors((prev) => ({ ...prev, attachment: undefined }));
    }
  };

  // Filter weekends in the datepicker (visual indicator)
  const isWeekday = (date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  };

  // =============================================================
  // Render
  // =============================================================
  return (
    <div className="leave-request-page">
      {/* Page Header */}
      <div className="page-header">
        <h1>New Leave Request</h1>
        <p>
          Hello {user?.firstName}, submit your leave request below
        </p>
      </div>

      {/* Balance Cards */}
      {!balancesLoading && Object.keys(balances).length > 0 && (
        <div className="balance-cards">
          {Object.entries(balances).map(([type, bal]) => (
            <div className="balance-card" key={type}>
              <div
                className={`balance-value ${
                  bal.remaining === 0
                    ? 'empty'
                    : bal.remaining <= 3
                    ? 'low'
                    : ''
                }`}
              >
                {bal.remaining}
              </div>
              <div className="balance-label">{bal.label}</div>
              <div className="balance-max">/ {bal.max} days</div>
            </div>
          ))}
        </div>
      )}

      {/* Form Card */}
      <div className="leave-form-card">
        {/* Back link */}
        <a href="/dashboard" className="back-link" id="back-to-dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </a>

        {/* Success alert */}
        {success && (
          <div className="alert alert-success" role="status" id="leave-success-alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="alert alert-error" role="alert" id="leave-error-alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form className="leave-form" onSubmit={handleSubmit} noValidate id="leave-request-form">
          {/* ===== Leave Type ===== */}
          <div className={`form-group ${fieldErrors.leaveType ? 'has-error' : ''}`}>
            <label htmlFor="leave-type">Leave type</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <select
                id="leave-type"
                value={leaveType}
                onChange={(e) => {
                  setLeaveType(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, leaveType: undefined }));
                }}
                aria-invalid={fieldErrors.leaveType ? 'true' : 'false'}
              >
                <option value="">Select a leave type...</option>
                {leaveTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({t.maxDays} days/year)
                  </option>
                ))}
              </select>
            </div>
            {fieldErrors.leaveType && (
              <span className="field-error" role="alert">{fieldErrors.leaveType}</span>
            )}
          </div>

          {/* ===== Date Range ===== */}
          <div className="form-row">
            {/* Start Date */}
            <div className={`form-group ${fieldErrors.startDate ? 'has-error' : ''}`}>
              <label htmlFor="start-date">Start date</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <DatePicker
                  id="start-date"
                  selected={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    // Auto-adjust end date if it's before start date
                    if (endDate && date > endDate) setEndDate(date);
                    setFieldErrors((prev) => ({ ...prev, startDate: undefined }));
                  }}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  minDate={new Date()}
                  filterDate={isWeekday}
                  placeholderText="Select start date"
                  dateFormat="dd/MM/yyyy"
                  autoComplete="off"
                />
              </div>
              {fieldErrors.startDate && (
                <span className="field-error" role="alert">{fieldErrors.startDate}</span>
              )}
            </div>

            {/* End Date */}
            <div className={`form-group ${fieldErrors.endDate ? 'has-error' : ''}`}>
              <label htmlFor="end-date">End date</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <DatePicker
                  id="end-date"
                  selected={endDate}
                  onChange={(date) => {
                    setEndDate(date);
                    setFieldErrors((prev) => ({ ...prev, endDate: undefined }));
                  }}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate || new Date()}
                  filterDate={isWeekday}
                  placeholderText="Select end date"
                  dateFormat="dd/MM/yyyy"
                  autoComplete="off"
                />
              </div>
              {fieldErrors.endDate && (
                <span className="field-error" role="alert">{fieldErrors.endDate}</span>
              )}
            </div>
          </div>

          {/* ===== Business Days Badge ===== */}
          {businessDays > 0 && (
            <div
              className={`days-badge ${isInsufficientBalance ? 'warning' : ''}`}
              id="business-days-badge"
            >
              <span className="days-number">{businessDays}</span>
              <span className="days-label">
                business day{businessDays > 1 ? 's' : ''}
                {selectedBalance && (
                  <>
                    <br />
                    {selectedBalance.remaining} remaining
                  </>
                )}
              </span>
            </div>
          )}

          {/* ===== Reason (optional) ===== */}
          <div className={`form-group ${fieldErrors.reason ? 'has-error' : ''}`}>
            <label htmlFor="leave-reason">
              Reason <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <div className="input-wrapper">
              <svg className="input-icon" style={{ top: 16, alignSelf: 'flex-start' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="17" y1="10" x2="3" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="17" y1="18" x2="3" y2="18" />
              </svg>
              <textarea
                id="leave-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a reason for your leave (optional)..."
                maxLength={500}
                rows={3}
              />
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: '#64748b', marginTop: 4 }}>
              {reason.length}/500
            </div>
            {fieldErrors.reason && (
              <span className="field-error" role="alert">{fieldErrors.reason}</span>
            )}
          </div>

          {/* ===== File Upload ===== */}
          <div className={`form-group ${fieldErrors.attachment ? 'has-error' : ''}`}>
            <label>
              Attachment <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <div
              className={`upload-area ${dragover ? 'dragover' : ''} ${attachment ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                id="attachment-input"
              />
              <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="upload-text">
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="upload-hint">PDF, JPEG, PNG or WebP – Max 5MB</p>
            </div>

            {/* File Preview */}
            {attachment && (
              <div className="file-preview">
                <div className="file-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="file-info">
                  <div className="file-name">{attachment.name}</div>
                  <div className="file-size">{formatFileSize(attachment.size)}</div>
                </div>
                <button
                  type="button"
                  className="remove-file"
                  onClick={removeFile}
                  aria-label="Remove file"
                  id="remove-attachment-btn"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            {fieldErrors.attachment && (
              <span className="field-error" role="alert">{fieldErrors.attachment}</span>
            )}
          </div>

          {/* ===== Submit Button ===== */}
          <button
            type="submit"
            className="submit-btn"
            disabled={loading || isInsufficientBalance}
            id="submit-leave-btn"
          >
            <span className="btn-content">
              {loading && <span className="spinner" />}
              {loading ? 'Submitting...' : 'Submit Leave Request'}
            </span>
          </button>

          {/* Insufficient balance warning below button */}
          {isInsufficientBalance && (
            <div className="alert alert-error" style={{ marginTop: 16, marginBottom: 0 }} role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>
                Insufficient leave balance. You have {selectedBalance?.remaining} day(s)
                remaining but are requesting {businessDays} day(s).
              </span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestForm;
