import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons based on severity
const createCustomIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const icons = {
  CRITICAL: createCustomIcon('red'),
  WARNING: createCustomIcon('orange'),
  DEFAULT: createCustomIcon('blue')
};

// Component to auto-center map when events change
function MapUpdater({ events }) {
  const map = useMap();
  useEffect(() => {
    if (events && events.length > 0) {
      const latestEvent = events[0];
      if (latestEvent.latitude && latestEvent.longitude) {
        map.setView([latestEvent.latitude, latestEvent.longitude], map.getZoom());
      }
    }
  }, [events, map]);
  return null;
}

export default function IncidentMap({ events }) {
  // Default center: roughly center of US or a specific location if preferred
  const defaultCenter = [39.8283, -98.5795];
  
  const validEvents = events.filter(e => e.latitude && e.longitude);

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer 
        center={validEvents.length > 0 ? [validEvents[0].latitude, validEvents[0].longitude] : defaultCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {validEvents.map((event) => {
          const isCritical = event.fatigueLevel === 'CRITICAL';
          const isWarning = event.fatigueLevel === 'WARNING';
          const icon = isCritical ? icons.CRITICAL : (isWarning ? icons.WARNING : icons.DEFAULT);
          
          return (
            <Marker 
              key={event.id} 
              position={[event.latitude, event.longitude]}
              icon={icon}
            >
              <Popup>
                <div style={{ padding: '4px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: isCritical ? 'var(--accent-coral)' : (isWarning ? 'var(--warning-yellow)' : 'var(--accent-cyan)') }}>
                    {event.fatigueLevel} ALERT
                  </h4>
                  <p style={{ margin: '4px 0' }}><strong>Driver ID:</strong> {event.trip?.driverId || 'Unknown'}</p>
                  <p style={{ margin: '4px 0' }}><strong>Time:</strong> {new Date(event.timestamp).toLocaleTimeString()}</p>
                  <p style={{ margin: '4px 0' }}><strong>Signal:</strong> {event.primarySignal}</p>
                  
                  {event.latitude && event.longitude && (
                    <div style={{ marginTop: '12px' }}>
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '8px 12px',
                          background: '#FF5238',
                          color: '#fff',
                          textDecoration: 'none',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        📍 Navigate to Location
                      </a>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        <MapUpdater events={validEvents} />
      </MapContainer>
    </div>
  );
}
