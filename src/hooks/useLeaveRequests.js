// src/hooks/useLeaveRequests.js
// Custom hook for fetching and mutating leave requests (manager dashboard)
// =========================================================
// Uses useState + useEffect for data fetching. Provides optimistic UI
// updates when the manager approves/rejects/requests modifications.
// =========================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

// =============================================================
// Default filter state
// =============================================================
const DEFAULT_FILTERS = {
  status: '',        // '' = all, or comma-separated: 'pending,approved'
  employee: '',      // employee ObjectId
  leaveType: '',     // leave type enum value
  dateFrom: '',      // ISO date string
  dateTo: '',        // ISO date string
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const useLeaveRequests = (initialFilters = {}) => {
  // --- State ---
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [statusCounts, setStatusCounts] = useState({});
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initialFilters });

  // Track the latest fetch to avoid race conditions
  const fetchIdRef = useRef(0);

  // =============================================================
  // Fetch team leave requests from the server
  // =============================================================
  const fetchRequests = useCallback(async (currentFilters) => {
    const fetchId = ++fetchIdRef.current;

    try {
      setLoading(true);
      setError(null);

      // Build query params, omitting empty values
      const params = {};
      Object.entries(currentFilters || filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params[key] = value;
        }
      });

      const { data } = await api.get('/leave-requests/team', { params });

      // Only update state if this is still the latest request
      if (fetchId === fetchIdRef.current) {
        setRequests(data.data.leaveRequests);
        setPagination(data.data.pagination);
        setStatusCounts(data.data.statusCounts || {});
      }
    } catch (err) {
      if (fetchId === fetchIdRef.current) {
        const message = err.response?.data?.message || 'Failed to load leave requests.';
        setError(message);
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  // =============================================================
  // Fetch on mount and when filters change
  // =============================================================
  useEffect(() => {
    fetchRequests(filters);
  }, [filters, fetchRequests]);

  // =============================================================
  // Update filters (merges with existing, resets to page 1)
  // =============================================================
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page || 1, // reset to page 1 on filter change
    }));
  }, []);

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  // Go to a specific page
  const goToPage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  // =============================================================
  // Update leave request status (with optimistic UI)
  // =============================================================
  const updateStatus = useCallback(async (requestId, status, comment = '') => {
    // OPTIMISTIC UI: Save the current state for rollback
    const previousRequests = [...requests];

    // Immediately update the UI
    setRequests((prev) =>
      prev.map((req) =>
        req._id === requestId
          ? {
              ...req,
              status,
              reviewComment: comment,
              reviewedAt: new Date().toISOString(),
              // Keep a flag marking this as optimistically updated
              _optimistic: true,
            }
          : req
      )
    );

    try {
      const { data } = await api.patch(`/leave-requests/${requestId}/status`, {
        status,
        comment,
      });

      // Replace the optimistic update with the real server data
      setRequests((prev) =>
        prev.map((req) =>
          req._id === requestId ? data.data.leaveRequest : req
        )
      );

      return { success: true, data: data.data.leaveRequest };
    } catch (err) {
      // ROLLBACK: Restore the previous state on failure
      setRequests(previousRequests);

      const message = err.response?.data?.message || 'Failed to update status.';
      return { success: false, message };
    }
  }, [requests]);

  // =============================================================
  // Manual refresh
  // =============================================================
  const refresh = useCallback(() => {
    fetchRequests(filters);
  }, [filters, fetchRequests]);

  return {
    // Data
    requests,
    loading,
    error,
    pagination,
    statusCounts,
    filters,

    // Actions
    updateFilters,
    resetFilters,
    goToPage,
    updateStatus,
    refresh,
  };
};

export default useLeaveRequests;
