import React, { useEffect, useState } from 'react';
import { getFleetSummary, getDriverFatigueTrend, getMapIncidents } from '../../api/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import IncidentMap from './IncidentMap';

export default function DashboardOverview() {
  const getTodayString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  
  const [summary, setSummary] = useState({ activeDrivers: 0, fatigueFlagsToday: 0 });
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  // For MVP demo, hardcode a mock driverId or fetch the first driver if no data
  const DEMO_DRIVER_ID = "mock-driver-123";

  const [recentEvents, setRecentEvents] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sumData = await getFleetSummary(selectedDate);
        setSummary(sumData);
        
        try {
          const [incidentsRes] = await Promise.all([
            getMapIncidents(selectedDate).catch(() => [])
          ]);
          
          let trendRes = { events: [] };
          // If we have incidents, grab the driverId of the most recent one to show their trend
          if (incidentsRes && incidentsRes.length > 0) {
            const dynamicDriverId = incidentsRes[0].trip?.driverId || DEMO_DRIVER_ID;
            trendRes = await getDriverFatigueTrend(dynamicDriverId, selectedDate).catch(() => ({ events: [] }));
            setRecentEvents(incidentsRes);
          } else {
            setRecentEvents([]);
          }
          
          if (trendRes.events && trendRes.events.length > 0) {
            const mappedTrend = trendRes.events.map(e => ({
              time: new Date(e.eventTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              level: e.fatigueLevel === 'CRITICAL' ? 3 : e.fatigueLevel === 'WARNING' ? 2 : 1
            }));
            setTrendData(mappedTrend);
          } else {
            setTrendData(getMockTrendData());
          }
        } catch (e) {
          setTrendData(getMockTrendData());
          setRecentEvents([]);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchData();
    const intervalId = setInterval(fetchData, 3000); // Auto-refresh every 3 seconds
    return () => clearInterval(intervalId);
  }, [selectedDate]);

  const getMockTrendData = () => [
    { time: '08:00', level: 1 },
    { time: '09:00', level: 1 },
    { time: '10:00', level: 2 },
    { time: '11:00', level: 1 },
    { time: '12:00', level: 3 },
    { time: '13:00', level: 2 },
  ];

  return (
    <div className="main-content">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Fleet Dashboard</h1>
          <div style={{color: 'var(--text-muted)'}}>
            {selectedDate === getTodayString() ? 'Live Monitoring Active' : `Viewing Historical Data: ${selectedDate}`}
          </div>
        </div>
        <div className="date-filter" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="overview-date" style={{ fontWeight: '500' }}>Date:</label>
          <input 
            type="date" 
            id="overview-date"
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
          <span className="stat-title">Active Drivers</span>
          <span className="stat-value">{summary.activeDrivers || 0}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-title">Fatigue Flags Today</span>
          <span className={`stat-value ${summary.fatigueFlagsToday > 0 ? 'warning' : 'good'}`}>
            {summary.fatigueFlagsToday || 0}
          </span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-title">Critical Events</span>
          <span className="stat-value critical">{recentEvents.filter(e => e.fatigueLevel === 'CRITICAL').length}</span>
        </div>
      </div>

      <div className="charts-grid">
        <div className="glass-panel chart-container">
          <h2 style={{marginTop: 0, marginBottom: '24px', fontSize: '1.2rem'}}>Driver Fatigue Trend (Demo)</h2>
          {loading ? (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>Loading...</div>
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
                  type="monotone" 
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
                  <div style={{fontWeight: 600}}>Driver: {event.trip?.driverId || 'Unknown'}</div>
                  <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                    {new Date(event.eventTimestamp).toLocaleTimeString()} • {event.primarySignal}
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
        <IncidentMap events={recentEvents} />
      </div>
    </div>
  );
}
