import { useEffect, useState } from 'react';
import { MapPin, Layers, RefreshCw } from 'lucide-react';
import MapView from '../components/MapView';
import api from '../services/api';
import './MapPage.css';

export default function MapPage() {
  const [markers, setMarkers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [mapMode, setMapMode]   = useState('issues'); // 'issues' or 'projects'
  const [stats, setStats]       = useState({ critical: 0, high: 0, medium: 0, low: 0 });

  const fetchMarkers = async () => {
    setLoading(true);
    try {
      const endpoint = mapMode === 'issues' ? '/map/clusters' : '/map/projects';
      const { data } = await api.get(endpoint);
      const m = data.data.markers || [];
      setMarkers(m);
      
      if (mapMode === 'issues') {
        const s = { critical: 0, high: 0, medium: 0, low: 0 };
        m.forEach((mk) => { if (s[mk.severity] !== undefined) s[mk.severity]++; });
        setStats(s);
      }
    } catch (_) {
      // Offline mock markers
      const mock = generateMockMarkers();
      setMarkers(mock);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMarkers(); }, [mapMode]);

  return (
    <div className="page-content">
      <div className="map-page container">
        <div className="map-page__header">
          <div>
            <h1>Live Issue Map</h1>
            <p>Real-time road issues across your city</p>
          </div>
          <div className="map-page__actions">
            <div className="map-mode-toggle">
              <button 
                className={`mode-btn ${mapMode === 'issues' ? 'active' : ''}`}
                onClick={() => setMapMode('issues')}
              >
                Issues
              </button>
              <button 
                className={`mode-btn ${mapMode === 'projects' ? 'active' : ''}`}
                onClick={() => setMapMode('projects')}
              >
                Budgets
              </button>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchMarkers}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Legend */}
        {mapMode === 'issues' ? (
          <div className="map-page__legend">
            {[
              { sev: 'critical', color: '#EF4444', count: stats.critical },
              { sev: 'high',     color: '#F97316', count: stats.high },
              { sev: 'medium',   color: '#FBBF24', count: stats.medium },
              { sev: 'low',      color: '#4ADE80', count: stats.low },
            ].map(({ sev, color, count }) => (
              <div key={sev} className="map-page__legend-item">
                <div className="map-page__legend-dot" style={{ background: color, boxShadow: `0 0 8px ${color}88` }} />
                <span className="map-page__legend-label">{sev}</span>
                <span className="map-page__legend-count">{count}</span>
              </div>
            ))}
            <span className="map-page__total">{markers.length} total issues</span>
          </div>
        ) : (
          <div className="map-page__legend">
             <div className="map-page__legend-item">
                <div className="map-page__legend-dot" style={{ background: '#3B82F6', boxShadow: '0 0 8px #3B82F688' }} />
                <span className="map-page__legend-label">Active Construction Projects</span>
              </div>
              <span className="map-page__total">{markers.length} linked sites</span>
          </div>
        )}

        {loading ? (
          <div className="map-page__loading">
            <div className="spinner spinner-lg" />
            <p>Loading map data…</p>
          </div>
        ) : (
          <MapView
            markers={markers}
            height="calc(100vh - 300px)"
            showFilters={mapMode === 'issues'}
            type={mapMode}
          />
        )}
      </div>
    </div>
  );
}

// ── Mock data for offline dev ─────────────────────────────────
function generateMockMarkers() {
  const TYPES    = ['pothole','crack','waterlogging','broken_divider','other'];
  const SEVE     = ['low','medium','high','critical'];
  const STATUSES = ['submitted','in_progress','resolved'];
  const center   = [12.9716, 77.5946]; // Bangalore
  return Array.from({ length: 40 }, (_, i) => ({
    id:          `mock-${i}`,
    reference_no:`RW-2024-${String(i+1).padStart(5,'0')}`,
    latitude:    center[0] + (Math.random() - 0.5) * 0.12,
    longitude:   center[1] + (Math.random() - 0.5) * 0.12,
    issue_type:  TYPES[Math.floor(Math.random() * TYPES.length)],
    severity:    SEVE[Math.floor(Math.random() * SEVE.length)],
    status:      STATUSES[Math.floor(Math.random() * STATUSES.length)],
    title:       `Road issue #${i+1}`,
  }));
}
