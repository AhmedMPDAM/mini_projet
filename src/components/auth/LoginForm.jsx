// src/components/auth/LoginForm.jsx
// Premium login form component with react-hook-form validation
// =========================================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './LoginForm.css';

const LoginForm = () => {
  const { login, forgotPassword, error: authError, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Also redirect automatically if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // =============================================================
  // react-hook-form setup with validation rules
  // =============================================================
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur', // Validate on blur for better UX
  });

  // =============================================================
  // Form submission handlers
  // =============================================================
  const onLoginSubmit = async (formData) => {
    const result = await login(formData.email, formData.password);
    if (result.success) {
      console.log('Login successful');
      navigate('/dashboard');
    }
  };

  const onForgotSubmit = async (formData) => {
    const result = await forgotPassword(formData.email);
    if (result.success) {
      setForgotSuccess(true);
    }
  };

  // Switch between login and forgot-password modes
  const switchToForgot = () => {
    setMode('forgot');
    setForgotSuccess(false);
    reset({ email: '', password: '' });
  };

  const switchToLogin = () => {
    setMode('login');
    setForgotSuccess(false);
    reset({ email: '', password: '' });
  };

  // =============================================================
  // Render
  // =============================================================
  return (
    <div className="login-page">
      <div className="login-card">
        {/* Back button (forgot-password mode) */}
        {mode === 'forgot' && (
          <button
            type="button"
            className="back-btn"
            onClick={switchToLogin}
            id="back-to-login-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to login
          </button>
        )}

        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h1>
            {mode === 'login' ? 'Welcome back' : 'Reset password'}
          </h1>
          <p>
            {mode === 'login'
              ? 'Sign in to manage your leave requests'
              : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {/* Global error alert */}
        {authError && !forgotSuccess && (
          <div className="alert alert-error" role="alert" id="auth-error-alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{authError}</span>
          </div>
        )}

        {/* Success alert (forgot-password) */}
        {forgotSuccess && (
          <div className="alert alert-success" role="status" id="forgot-success-alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>
              If an account with that email exists, a password reset link
              has been sent. Check your inbox.
            </span>
          </div>
        )}

        {/* =========================================================
            LOGIN FORM
            ========================================================= */}
        {mode === 'login' && (
          <form onSubmit={handleSubmit(onLoginSubmit)} noValidate id="login-form">
            {/* Email field */}
            <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
              <label htmlFor="login-email">Email</label>
              <div className="input-wrapper">
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  {...register('email', {
                    required: 'Email is required.',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address.',
                    },
                  })}
                />
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              {errors.email && (
                <span className="field-error" id="email-error" role="alert">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password field */}
            <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
              <label htmlFor="login-password">Password</label>
              <div className="input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password', {
                    required: 'Password is required.',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters.',
                    },
                  })}
                />
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  id="toggle-password-btn"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <span className="field-error" id="password-error" role="alert">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting || loading}
              id="login-submit-btn"
            >
              <span className="btn-content">
                {(isSubmitting || loading) && <span className="spinner" />}
                {isSubmitting || loading ? 'Signing in...' : 'Sign in'}
              </span>
            </button>

            {/* Footer with links */}
            <div className="login-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                className="forgot-link"
                onClick={switchToForgot}
                id="forgot-password-link"
              >
                Forgot your password?
              </button>
              <div>
                <span style={{ color: '#94a3b8' }}>Don't have an account? </span>
                <Link to="/register" className="forgot-link" style={{ display: 'inline-block' }}>
                  Sign up
                </Link>
              </div>
            </div>
          </form>
        )}

        {/* =========================================================
            FORGOT PASSWORD FORM
            ========================================================= */}
        {mode === 'forgot' && !forgotSuccess && (
          <form onSubmit={handleSubmit(onForgotSubmit)} noValidate id="forgot-password-form">
            {/* Email field */}
            <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
              <label htmlFor="forgot-email">Email address</label>
              <div className="input-wrapper">
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  aria-invalid={errors.email ? 'true' : 'false'}
                  {...register('email', {
                    required: 'Email is required.',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address.',
                    },
                  })}
                />
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              {errors.email && (
                <span className="field-error" role="alert">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting || loading}
              id="forgot-submit-btn"
            >
              <span className="btn-content">
                {(isSubmitting || loading) && <span className="spinner" />}
                {isSubmitting || loading ? 'Sending...' : 'Send reset link'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginForm;
