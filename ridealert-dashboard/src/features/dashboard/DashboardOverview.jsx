import React, { useEffect, useState } from 'react';
import { getFleetSummary, getDriverFatigueTrend } from '../../api/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardOverview() {
  const [summary, setSummary] = useState({ activeDrivers: 0, fatigueFlagsToday: 0 });
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  // For MVP demo, hardcode a mock driverId or fetch the first driver if no data
  const DEMO_DRIVER_ID = "mock-driver-123";

  const [recentEvents, setRecentEvents] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sumData = await getFleetSummary();
        setSummary(sumData);
        
        try {
          // Attempt to fetch real trend data, gracefully fallback on failure
          const trendRes = await getDriverFatigueTrend(DEMO_DRIVER_ID);
          
          if (trendRes.events && trendRes.events.length > 0) {
            // Keep the raw events for the recent list (sort descending by time)
            setRecentEvents([...trendRes.events].sort((a,b) => new Date(b.eventTimestamp) - new Date(a.eventTimestamp)));
            
            // Map events to chart-friendly format
            const mappedTrend = trendRes.events.map(e => ({
              time: new Date(e.eventTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              level: e.fatigueLevel === 'CRITICAL' ? 3 : e.fatigueLevel === 'WARNING' ? 2 : 1
            }));
            setTrendData(mappedTrend);
          } else {
            setTrendData(getMockTrendData());
            setRecentEvents([]);
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

    fetchData();
    const intervalId = setInterval(fetchData, 3000); // Auto-refresh every 3 seconds
    return () => clearInterval(intervalId);
  }, []);

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
      <div className="header">
        <h1>Fleet Dashboard</h1>
        <div style={{color: 'var(--text-muted)'}}>
          Live Monitoring Active
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
                  <div style={{fontWeight: 600}}>Driver: {DEMO_DRIVER_ID}</div>
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
    </div>
  );
}
