import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDrivers, deleteOldData, deleteDriver } from '../../api/client';

export default function DriversList() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const data = await getDrivers();
      setDrivers(data);
    } catch (error) {
      console.error('Failed to fetch drivers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleDeleteOldData = async () => {
    if (window.confirm("Are you sure you want to delete all events and trips older than 30 days? This action cannot be undone.")) {
      try {
        await deleteOldData();
        alert("Old data deleted successfully.");
        fetchDrivers();
      } catch (e) {
        console.error(e);
        alert("Failed to delete old data.");
      }
    }
  };

  const handleDeleteDriver = async (driverId) => {
    if (window.confirm(`Are you sure you want to completely delete driver ${driverId} and all their historical trips and events? This action cannot be undone.`)) {
      try {
        await deleteDriver(driverId);
        setDrivers(drivers.filter(d => d.id !== driverId));
      } catch (e) {
        console.error(e);
        alert("Failed to delete driver.");
      }
    }
  };

  return (
    <div className="main-content">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Manager Drivers Details</h1>
        <button 
          onClick={handleDeleteOldData}
          style={{
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Delete Records Older Than 30 Days
        </button>
      </div>
      
      <div className="glass-panel">
        <h2 style={{marginTop: 0, marginBottom: '24px', fontSize: '1.2rem'}}>Historical Driver Activity</h2>
        
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading drivers...</div>
        ) : drivers.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No drivers found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Driver ID</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Name</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Trips</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Alerts</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Last Active</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px', fontWeight: 500 }}>
                      <Link to={`/drivers/${driver.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                        {driver.id}
                      </Link>
                    </td>
                    <td style={{ padding: '16px' }}>{driver.name}</td>
                    <td style={{ padding: '16px' }}>{driver.totalTrips}</td>
                    <td style={{ padding: '16px' }}>{driver.totalAlerts || 0}</td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {driver.latestTripTime ? new Date(driver.latestTripTime).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteDriver(driver.id)}
                        style={{
                          background: 'transparent',
                          color: '#ef4444',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
