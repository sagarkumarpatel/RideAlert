import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import DashboardOverview from './features/dashboard/DashboardOverview';
import DriverOverview from './features/dashboard/DriverOverview';
import DriversList from './features/dashboard/DriversList';
import AddDriver from './features/dashboard/AddDriver';
import EventsList from './features/dashboard/EventsList';
import Login from './features/auth/Login';
import './index.css';

// SVG Icons
const Icons = {
  Dashboard: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>,
  Drivers: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  AddDriver: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>,
  Activity: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
};

function Layout({ children, onLogout, theme, toggleTheme }) {
  const location = useLocation();
  
  return (
    <div className="dashboard-layout">
      <nav className="sidebar">
        <div className="logo-container">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF5238" />
                <stop offset="100%" stopColor="#FF8A65" />
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
            <Icons.Drivers /> Manage Drivers
          </Link>
          <Link to="/add-driver" className={`nav-link ${location.pathname === '/add-driver' ? 'active' : ''}`}>
            <Icons.AddDriver /> Add Driver
          </Link>
          <Link to="/events" className={`nav-link ${location.pathname === '/events' ? 'active' : ''}`}>
            <Icons.Activity /> Fatigue Events
          </Link>
        </div>

        <button 
          onClick={onLogout}
          className="nav-link"
          style={{
            marginTop: 'auto',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            width: '100%',
            color: 'var(--accent-coral)',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            borderRadius: '12px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 82, 56, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Logout
        </button>
      </nav>
      
      <div className="main-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 40px 0', flexShrink: 0 }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-coral)',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
          >
            {theme === 'light' ? (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> Dark Mode</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> Light Mode</>
            )}
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
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
  const [theme, setTheme] = React.useState(localStorage.getItem('dashboardTheme') || 'dark');

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dashboardTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Keep authToken in sync when interceptor clears it
  React.useEffect(() => {
    const onStorage = () => {
      const token = localStorage.getItem('adminToken');
      if (!token && authToken) {
        setAuthToken(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [authToken]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAuthToken(null);
  };

  const ProtectedRoute = ({ children }) => {
    if (!authToken) {
      return <Navigate to="/login" replace />;
    }
    return <Layout onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme}>{children}</Layout>;
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
            <DriversList />
          </ProtectedRoute>
        } />
        <Route path="/drivers/:driverId" element={
          <ProtectedRoute>
            <DriverOverview />
          </ProtectedRoute>
        } />
        <Route path="/events" element={
          <ProtectedRoute>
            <EventsList />
          </ProtectedRoute>
        } />
        <Route path="/add-driver" element={
          <ProtectedRoute>
            <AddDriver />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
