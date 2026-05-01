// src/components/auth/RegisterForm.jsx
// Premium sign up form component with react-hook-form validation
// =========================================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './LoginForm.css'; // Reusing the same premium CSS

const RegisterForm = () => {
    const { signup, error: authError, loading, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    // Redirect automatically if already authenticated
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
    } = useForm({
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });

    // =============================================================
    // Form submission handler
    // =============================================================
    const onRegisterSubmit = async (formData) => {
        const result = await signup(formData.firstName, formData.lastName, formData.email, formData.password);
        if (result.success) {
            navigate('/dashboard');
        }
    };

    // =============================================================
    // Render
    // =============================================================
    return (
        <div className="login-page">
            <div className="login-card">
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
                    <h1>Create an account</h1>
                    <p>Sign up to start managing your leave requests</p>
                </div>

                {/* Global error alert */}
                {authError && (
                    <div className="alert alert-error" role="alert">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <span>{authError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit(onRegisterSubmit)} noValidate>
                    {/* First/Last Name fields side by side */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className={`form-group ${errors.firstName ? 'has-error' : ''}`} style={{ flex: 1 }}>
                            <label htmlFor="firstName">First Name</label>
                            <div className="input-wrapper">
                                <input
                                    id="firstName"
                                    type="text"
                                    placeholder="John"
                                    {...register('firstName', { required: 'First name is required.' })}
                                />
                            </div>
                            {errors.firstName && <span className="field-error">{errors.firstName.message}</span>}
                        </div>

                        <div className={`form-group ${errors.lastName ? 'has-error' : ''}`} style={{ flex: 1 }}>
                            <label htmlFor="lastName">Last Name</label>
                            <div className="input-wrapper">
                                <input
                                    id="lastName"
                                    type="text"
                                    placeholder="Doe"
                                    {...register('lastName', { required: 'Last name is required.' })}
                                />
                            </div>
                            {errors.lastName && <span className="field-error">{errors.lastName.message}</span>}
                        </div>
                    </div>

                    {/* Email field */}
                    <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                {...register('email', {
                                    required: 'Email is required.',
                                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Please enter a valid email address.' },
                                })}
                            />
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                            </svg>
                        </div>
                        {errors.email && <span className="field-error">{errors.email.message}</span>}
                    </div>

                    {/* Password field */}
                    <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Create a password"
                                {...register('password', {
                                    required: 'Password is required.',
                                    minLength: { value: 8, message: 'Password must be at least 8 characters.' },
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
                        {errors.password && <span className="field-error">{errors.password.message}</span>}
                    </div>

                    {/* Submit button */}
                    <button type="submit" className="submit-btn" disabled={isSubmitting || loading}>
                        <span className="btn-content">
                            {(isSubmitting || loading) && <span className="spinner" />}
                            {isSubmitting || loading ? 'Creating...' : 'Sign Up'}
                        </span>
                    </button>

                    {/* Footer - Sign in link */}
                    <div className="login-footer" style={{ marginTop: '24px' }}>
                        <span style={{ color: '#94a3b8' }}>Already have an account? </span>
                        <Link to="/login" className="forgot-link" style={{ display: 'inline-block' }}>
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterForm;
