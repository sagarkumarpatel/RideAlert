import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import DashboardOverview from './features/dashboard/DashboardOverview';
import DriverOverview from './features/dashboard/DriverOverview';
import DriversList from './features/dashboard/DriversList';
import AddDriver from './features/dashboard/AddDriver';
import EventsList from './features/dashboard/EventsList';
import Login from './features/auth/Login';
import Signup from './features/auth/Signup';
import { NeatGradient } from "@firecms/neat";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  return (
    <div className="dashboard-layout">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <nav className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
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
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.Dashboard /> Overview
          </Link>
          <Link to="/drivers" className={`nav-link ${location.pathname === '/drivers' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.Drivers /> Manage Drivers
          </Link>
          <Link to="/add-driver" className={`nav-link ${location.pathname === '/add-driver' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.AddDriver /> Add Driver
          </Link>
          <Link to="/events" className={`nav-link ${location.pathname === '/events' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
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
        <div className="topbar">
          <button 
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          
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
        <div className="scrollable-content" style={{ flex: 1, overflow: 'auto' }}>
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
    const config = {
      colors: [
        { color: '#167CB3', enabled: true },
        { color: '#CB9854', enabled: true },
        { color: '#CE96CE', enabled: true },
        { color: '#E0115F', enabled: true },
        { color: '#FFFFFF', enabled: false },
        { color: '#000000', enabled: false },
      ],
      speed: 2.5,
      horizontalPressure: 5,
      verticalPressure: 5,
      waveFrequencyX: 2,
      waveFrequencyY: 3,
      waveAmplitude: 6,
      secondaryWaveEnabled: false,
      secondaryWaveFrequencyX: 3,
      secondaryWaveFrequencyY: 3,
      secondaryWaveAmplitude: 5,
      secondaryWaveSpeed: 0.6,
      secondaryWaveAngle: 1,
      shadows: 2,
      highlights: 0,
      colorBrightness: 0.9,
      colorSaturation: -3,
      wireframe: false,
      antialias: false,
      colorBlending: 5,
      backgroundColor: '#A1A4B7',
      backgroundAlpha: 1,
      grainScale: 0,
      grainSparsity: 0,
      grainIntensity: 0,
      grainSpeed: 0,
      resolution: 0.4,
      yOffset: 1076,
      yOffsetWaveMultiplier: 1,
      yOffsetColorMultiplier: 4.8,
      yOffsetFlowMultiplier: 5.3,
      flowDistortionA: 3.7,
      flowDistortionB: 0.8,
      flowScale: 1.6,
      flowEase: 0.32,
      flowEnabled: true,
      enableProceduralTexture: false,
      transparentTextureVoid: true,
      textureMode: 'bitmap',
      bakeEdgeSoftness: 1,
      textureVoidLikelihood: 0.29,
      textureVoidWidthMin: 120,
      textureVoidWidthMax: 420,
      textureBandDensity: 2.9,
      textureColorBlending: 0.06,
      textureSeed: 536,
      textureEase: 0.93,
      proceduralBackgroundColor: '#775454',
      textureShapeTriangles: 48,
      textureShapeCircles: 15,
      textureShapeBars: 15,
      textureShapeSquiggles: 27,
      domainWarpEnabled: true,
      domainWarpIntensity: 0.1,
      domainWarpScale: 2.4,
      vignetteIntensity: 0.45,
      vignetteRadius: 0.55,
      fresnelEnabled: false,
      fresnelPower: 2.7,
      fresnelIntensity: 1.3,
      fresnelColor: '#F7E7CE',
      iridescenceEnabled: false,
      iridescenceIntensity: 0.5,
      iridescenceSpeed: 1,
      prismEdgeEnabled: false,
      prismEdgeIntensity: 0.5,
      prismEdgeThinness: 3,
      prismEdgeSpread: 1,
      prismEdgeSpeed: 0.5,
      prismEdgeRipple: 1,
      bloomIntensity: 1.9,
      bloomThreshold: 0.6,
      chromaticAberration: 17,
      shapeType: 'ribbon',
      shapeRotationX: 0.3480000000000001,
      shapeRotationY: -26.783,
      shapeRotationZ: -0.29,
      shapeAutoRotateSpeedX: 0,
      shapeAutoRotateSpeedY: 0,
      sphereRadius: 15,
      torusRadius: 15,
      torusTube: 5,
      cylinderRadius: 10,
      cylinderHeight: 40,
      planeBend: 2.3,
      planeTwist: -2.9,
      silhouetteFade: 0.83,
      cylinderFade: 0.08,
      ribbonFade: 0.31,
      flatShading: false,
      cameraLock: false,
      cameraX: 0,
      cameraY: 0,
      cameraZ: 0,
      cameraRotationX: -0.014,
      cameraRotationY: -0.231,
      cameraRotationZ: 0,
      cameraZoom: 1,
    };

    const gradient = new NeatGradient({
      ref: document.getElementById("gradient"),
      ...config
    });

    const handleScroll = () => {
      gradient.yOffset = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (gradient.destroy) gradient.destroy();
    };
  }, []);

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
    <>
      <canvas id="gradient" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none' }}></canvas>
      <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          authToken ? <Navigate to="/" replace /> : <Login setAuthToken={setAuthToken} />
        } />
        <Route path="/signup" element={
          authToken ? <Navigate to="/" replace /> : <Signup setAuthToken={setAuthToken} />
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
    </>
  );
}

export default App;
