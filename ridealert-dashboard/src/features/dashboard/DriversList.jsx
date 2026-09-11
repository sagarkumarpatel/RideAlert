import React, { useEffect, useState } from 'react';
import { getDrivers } from '../../api/client';

export default function DriversList() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const data = await getDrivers();
        setDrivers(data);
      } catch (error) {
        console.error('Failed to fetch drivers', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  return (
    <div className="main-content">
      <div className="header">
        <h1>Drivers Management</h1>
      </div>
      
      <div className="glass-panel">
        <h2 style={{marginTop: 0, marginBottom: '24px', fontSize: '1.2rem'}}>Registered Fleet Drivers</h2>
        
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading drivers...</div>
        ) : drivers.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No drivers registered yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Driver ID</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Name</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Vehicle Type</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Trips</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px', fontWeight: 500 }}>{driver.id}</td>
                    <td style={{ padding: '16px' }}>{driver.name}</td>
                    <td style={{ padding: '16px' }}>{driver.defaultVehicleType}</td>
                    <td style={{ padding: '16px' }}>{driver.totalTrips}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.85rem',
                        backgroundColor: driver.latestTripStatus === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                        color: driver.latestTripStatus === 'ACTIVE' ? '#4ade80' : '#9ca3af'
                      }}>
                        {driver.latestTripStatus}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {driver.latestTripTime ? new Date(driver.latestTripTime).toLocaleString() : 'N/A'}
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
