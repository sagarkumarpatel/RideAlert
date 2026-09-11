import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ setAuthToken }) {
  const [adminPin, setAdminPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/auth/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminPin }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthToken(data.token);
        localStorage.setItem('adminToken', data.token);
        navigate('/');
      } else {
        setError(data.error || 'Invalid PIN');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-panel">
        <div className="logo-container" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#fff' }}>Admin Access</h2>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="adminPin">Admin PIN</label>
            <input
              type="password"
              id="adminPin"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="Enter PIN"
              required
              className="glass-input"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className={`action-btn primary ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
            style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
          >
            {isLoading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
