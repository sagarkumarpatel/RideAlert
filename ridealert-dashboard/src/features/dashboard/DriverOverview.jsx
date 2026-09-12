import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDriverOverview } from '../../api/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import IncidentMap from './IncidentMap';

export default function DriverOverview() {
  const { driverId } = useParams();
  
  const getTodayString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  
  const [driverInfo, setDriverInfo] = useState({ id: driverId, name: 'Loading...', status: 'INACTIVE' });
  const [summary, setSummary] = useState({ fatigueFlags: 0, criticalEvents: 0, totalTrips: 0 });
  const [trendData, setTrendData] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDriverOverview(driverId, selectedDate);
        setDriverInfo(data.driver);
        setSummary(data.summary);
        
        if (data.fatigueTrend && data.fatigueTrend.events && data.fatigueTrend.events.length > 0) {
          const mappedTrend = data.fatigueTrend.events.map((e) => ({
            time: new Date(e.eventTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            level: e.fatigueLevel === 'CRITICAL' ? 3 : e.fatigueLevel === 'WARNING' ? 2 : 1
          }));
          setTrendData(mappedTrend);
        } else {
          setTrendData([]);
        }
        
        setRecentEvents(data.recentAlerts || []);
        setIncidents(data.incidents || []);
        
      } catch (error) {
        console.error("Failed to fetch driver overview data:", error);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchData();
    const intervalId = setInterval(fetchData, 3000); // Auto-refresh every 3 seconds
    return () => clearInterval(intervalId);
  }, [driverId, selectedDate]);

  return (
    <div className="main-content">
      <div style={{ marginBottom: '16px' }}>
        <Link to="/drivers" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
          &larr; Back to Manage Drivers
        </Link>
      </div>
      
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, marginRight: '24px' }}>
          <h1 style={{ marginBottom: '16px' }}>Driver Overview</h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'var(--glass-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Name</div>
              <div style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '1.1rem' }}>{driverInfo.name || '-'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Driver ID</div>
              <div style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '1.1rem' }}>{driverInfo.id || '-'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Contact</div>
              <div style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '1.1rem' }}>{driverInfo.personalContact || '-'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Emergency Contact</div>
              <div style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '1.1rem' }}>{driverInfo.parentContact || '-'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Address</div>
              <div style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '1.1rem' }}>{driverInfo.address || '-'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Valid Licence</div>
              <div style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '1.1rem' }}>
                {driverInfo.hasLicence ? '✅ Yes' : '❌ No'}
              </div>
            </div>
          </div>
        </div>
        <div className="date-filter" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="driver-date" style={{ fontWeight: '500' }}>Date:</label>
          <input 
            type="date" 
            id="driver-date"
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

      <div className="summary-grid">
        <div className="glass-panel stat-card">
          <span className="stat-title">Driver Status</span>
          <span className={`stat-value ${driverInfo.status === 'ACTIVE' ? 'good' : ''}`} style={{ fontSize: '1.5rem', marginTop: '8px' }}>
            {driverInfo.status}
          </span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-title">Fatigue Flags</span>
          <span className={`stat-value ${summary.fatigueFlags > 0 ? 'warning' : 'good'}`}>
            {summary.fatigueFlags}
          </span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-title">Critical Events</span>
          <span className={`stat-value ${summary.criticalEvents > 0 ? 'critical' : 'good'}`}>
            {summary.criticalEvents}
          </span>
        </div>
      </div>

      <div className="charts-grid">
        <div className="glass-panel chart-container">
          <h2 style={{marginTop: 0, marginBottom: '24px', fontSize: '1.2rem'}}>Driver Fatigue Trend</h2>
          {loading ? (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>Loading...</div>
          ) : trendData.length === 0 ? (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)'}}>No events for this date.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{fill: '#94a3b8'}} />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{fill: '#94a3b8'}}
                  ticks={[1, 2, 3]} 
                  tickFormatter={(val) => val === 1 ? 'Normal' : val === 2 ? 'Warning' : 'Critical'}
                  domain={[1, 3]}
                />
                <Tooltip 
                  contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}}
                />
                <Line 
                  type="stepAfter" 
                  dataKey="level" 
                  stroke="url(#colorGradient)" 
                  strokeWidth={3}
                  dot={{fill: '#0f172a', strokeWidth: 2, r: 6}}
                  activeDot={{r: 8, stroke: '#fff', strokeWidth: 2}}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#eab308" stopOpacity={1}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={1}/>
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-panel">
          <h2 style={{marginTop: 0, marginBottom: '24px', fontSize: '1.2rem'}}>Recent Alerts</h2>
          <div className="event-log">
            {recentEvents.length > 0 ? recentEvents.slice(0, 5).map(event => (
              <div key={event.id} className={`event-item ${event.fatigueLevel.toLowerCase()}`}>
                <div>
                  <div style={{fontWeight: 600}}>{event.primarySignal}</div>
                  <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                    {new Date(event.eventTimestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div style={{fontWeight: 600, color: event.fatigueLevel === 'CRITICAL' ? 'var(--critical-red)' : 'var(--warning-yellow)'}}>
                  {event.fatigueLevel}
                </div>
              </div>
            )) : (
              <div style={{color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px'}}>
                No recent alerts.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '24px', height: '400px' }}>
        <h2 style={{marginTop: 0, marginBottom: '24px', fontSize: '1.2rem'}}>Live Incident Map</h2>
        <IncidentMap events={incidents} />
      </div>
    </div>
  );
}
