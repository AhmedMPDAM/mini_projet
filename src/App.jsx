// src/App.jsx
// Main application component with routing and auth protection
// =========================================================

import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import useAuth from './hooks/useAuth';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import LeaveRequestForm from './components/leave/LeaveRequestForm';
import ManagerDashboard from './components/manager/ManagerDashboard';
import TeamCalendar from './components/calendar/TeamCalendar';
import AdminUsersPanel from './components/admin/AdminUsersPanel';

// =============================================================
// ProtectedRoute – redirects unauthenticated users to login
// =============================================================
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0f0f23',
        color: '#f1f5f9',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div className="spinner" style={{
          width: 32,
          height: 32,
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }} />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// =============================================================
// Dashboard placeholder – replace with your actual dashboard
// =============================================================
const Dashboard = () => {
  const { user, logout, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();

  // If the user has manager or admin rights, show the ManagerDashboard
  if (isManager || isAdmin) {
    return <ManagerDashboard />;
  }

  // Otherwise, show the Employee Dashboard
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f23',
      color: '#f1f5f9',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 40,
        textAlign: 'center',
        maxWidth: 480,
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          Welcome, {user?.firstName}! 👋
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: 4 }}>
          {user?.email}
        </p>
        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 24,
        }}>
          {user?.role}
        </span>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
          Submit and track your leave requests.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/leave-request')}
            id="new-leave-btn"
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            + New Leave Request
          </button>
          <button
            onClick={logout}
            id="logout-btn"
            style={{
              padding: '12px 24px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 10,
              color: '#fca5a5',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================
// App – root component with routing
// =============================================================
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-request"
            element={
              <ProtectedRoute>
                <LeaveRequestForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-calendar"
            element={
              <ProtectedRoute>
                <TeamCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminUsersPanel />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
