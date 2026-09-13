import React, { useEffect, useState } from 'react';
import { getMapIncidents } from '../../api/client';

export default function EventsList() {
  const getTodayString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const dateParam = selectedDate === getTodayString() ? undefined : selectedDate;
        const data = await getMapIncidents(dateParam);
        setEvents(data);
      } catch (error) {
        console.error('Failed to fetch events', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [selectedDate]);

  return (
    <div className="main-content">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Fatigue Event Log</h1>
        <div className="date-filter" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="events-date" style={{ fontWeight: '500' }}>Date:</label>
          <input 
            type="date" 
            id="events-date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={getTodayString()}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'var(--text-color)',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>
      
      <div className="glass-panel">
        <h2 style={{marginTop: 0, marginBottom: '24px', fontSize: '1.2rem'}}>Recent Alerts</h2>
        
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading events...</div>
        ) : events.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No recent fatigue alerts.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Time</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Driver ID</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Severity</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Trigger</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>GPS Tracked</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px', fontWeight: 500 }}>
                      {new Date(event.eventTimestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px' }}>{event.trip?.driverId || 'Unknown'}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.85rem',
                        backgroundColor: event.fatigueLevel === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                        color: event.fatigueLevel === 'CRITICAL' ? 'var(--accent-coral)' : 'var(--warning-yellow)'
                      }}>
                        {event.fatigueLevel}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>{event.primarySignal}</td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {event.latitude && event.longitude ? 'Yes' : 'No'}
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
