import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import DashboardOverview from './features/dashboard/DashboardOverview';
import Login from './features/auth/Login';
import './index.css';

// SVG Icons
const Icons = {
  Dashboard: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>,
  Drivers: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Activity: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
};

function Layout({ children }) {
  const location = useLocation();
  
  return (
    <div className="dashboard-layout">
      <nav className="sidebar">
        <div className="logo-container">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          RideAlert
        </div>
        
        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            <Icons.Dashboard /> Overview
          </Link>
          <Link to="/drivers" className={`nav-link ${location.pathname === '/drivers' ? 'active' : ''}`}>
            <Icons.Drivers /> Drivers
          </Link>
          <Link to="/events" className={`nav-link ${location.pathname === '/events' ? 'active' : ''}`}>
            <Icons.Activity /> Fatigue Events
          </Link>
        </div>
      </nav>
      
      <div className="main-content-wrapper" style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

// Placeholder components for other routes
const Placeholder = ({ title }) => (
  <div className="main-content">
    <div className="header">
      <h1>{title}</h1>
    </div>
    <div className="glass-panel">
      <p style={{ color: 'var(--text-muted)' }}>This section is currently under development.</p>
    </div>
  </div>
);

function App() {
  const [authToken, setAuthToken] = React.useState(localStorage.getItem('adminToken'));

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAuthToken(null);
  };

  const ProtectedRoute = ({ children }) => {
    if (!authToken) {
      return <Navigate to="/login" replace />;
    }
    return <Layout onLogout={handleLogout}>{children}</Layout>;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          authToken ? <Navigate to="/" replace /> : <Login setAuthToken={setAuthToken} />
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardOverview authToken={authToken} />
          </ProtectedRoute>
        } />
        <Route path="/drivers" element={
          <ProtectedRoute>
            <Placeholder title="Drivers List" />
          </ProtectedRoute>
        } />
        <Route path="/events" element={
          <ProtectedRoute>
            <Placeholder title="Fatigue Event Log" />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
