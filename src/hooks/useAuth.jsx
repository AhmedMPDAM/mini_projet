// src/hooks/useAuth.js
// Custom authentication hook with React Context
// =========================================================
// Provides authentication state and methods (login, logout,
// forgot-password) throughout the component tree via Context API.
// =========================================================

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';

// Create the authentication context
const AuthContext = createContext(null);

// =============================================================
// AuthProvider – wraps the app and manages auth state
// =============================================================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // =============================================================
  // On mount: check if there is a valid session (access token)
  // =============================================================
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Verify the token by fetching the current user's profile
        const { data } = await api.get('/auth/me');
        setUser(data.data.user);
      } catch {
        // Token is invalid or expired (and refresh also failed)
        localStorage.removeItem('accessToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // =============================================================
  // login – authenticates user and stores tokens
  // =============================================================
  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const { data } = await api.post('/auth/login', { email, password });

      // Store the access token in localStorage
      // SECURITY: The refresh token is stored in an HttpOnly cookie
      // by the server and never exposed to JavaScript.
      localStorage.setItem('accessToken', data.data.accessToken);
      setUser(data.data.user);

      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message || 'An error occurred during login.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  // =============================================================
  // signup – registers user and stores tokens
  // =============================================================
  const signup = useCallback(async (firstName, lastName, email, password) => {
    try {
      setError(null);
      setLoading(true);

      const { data } = await api.post('/auth/register', { firstName, lastName, email, password });

      // Store the access token in localStorage
      localStorage.setItem('accessToken', data.data.accessToken);
      setUser(data.data.user);

      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message || 'An error occurred during sign up.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  // =============================================================
  // logout – clears the session and redirects
  // =============================================================
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the API call fails, clear local state
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      setError(null);
    }
  }, []);

  // =============================================================
  // forgotPassword – triggers the password reset email
  // =============================================================
  const forgotPassword = useCallback(async (email) => {
    try {
      setError(null);
      const { data } = await api.post('/auth/forgot-password', { email });
      return { success: true, message: data.message };
    } catch (err) {
      const message =
        err.response?.data?.message || 'An error occurred. Please try again.';
      setError(message);
      return { success: false, message };
    }
  }, []);

  // =============================================================
  // resetPassword – sets a new password with the reset token
  // =============================================================
  const resetPassword = useCallback(async (token, password, confirmPassword) => {
    try {
      setError(null);
      const { data } = await api.post(`/auth/reset-password/${token}`, {
        password,
        confirmPassword,
      });
      return { success: true, message: data.message };
    } catch (err) {
      const message =
        err.response?.data?.message || 'An error occurred. Please try again.';
      setError(message);
      return { success: false, message };
    }
  }, []);

  // Derived state: is the user authenticated?
  const isAuthenticated = !!user;

  // Role-check helpers
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isEmployee = user?.role === 'employee';

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isManager,
    isEmployee,
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// =============================================================
// useAuth – custom hook to consume the AuthContext
// =============================================================
const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Wrap your component tree with <AuthProvider>.'
    );
  }

  return context;
};

export default useAuth;
