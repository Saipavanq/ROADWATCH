import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const SEVERITY_COLORS = {
  low: '#4ADE80', medium: '#FBBF24', high: '#F97316', critical: '#EF4444',
};

function createSeverityIcon(severity) {
  const color = SEVERITY_COLORS[severity] || '#94A3B8';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;
      background:${color};
      border:3px solid ${color}44;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 12px ${color}88, 0 2px 8px rgba(0,0,0,0.4);
      font-size:12px;
    ">
      ${severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢'}
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Auto-fit markers
function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [markers, map]);
  return null;
}

export default function MapView({
  markers = [],
  roads = [],
  center = [12.9716, 77.5946],
  zoom = 12,
  height = '500px',
  showFilters = false,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = activeFilter === 'all'
    ? markers
    : markers.filter((m) => m.severity === activeFilter);

  const getHealthColor = (score) => {
    if (score >= 80) return '#22C55E';
    if (score >= 60) return '#EAB308';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };

  return (
    <div className="mapview">
      {showFilters && (
        <div className="mapview__filters">
          {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              className={`mapview__filter-btn ${activeFilter === sev ? 'active' : ''}`}
              style={activeFilter === sev && sev !== 'all' ? { borderColor: SEVERITY_COLORS[sev], color: SEVERITY_COLORS[sev] } : {}}
              onClick={() => setActiveFilter(sev)}
            >
              {sev === 'all' ? 'All Issues' : sev}
            </button>
          ))}
          <span className="mapview__count">{filtered.length} markers</span>
        </div>
      )}

      <div className="mapview__container" style={{ height }}>
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='© <a href="https://carto.com">CARTO</a>'
          />
          {markers.length > 1 && <FitBounds markers={markers} />}

          {roads.map((road, idx) => (
            <Polyline
              key={idx}
              positions={road.coordinates}
              pathOptions={{ color: getHealthColor(road.health_score), weight: 4 }}
            />
          ))}

          {filtered.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              icon={createSeverityIcon(marker.severity)}
              eventHandlers={{ click: () => setSelected(marker) }}
            >
              <Popup>
                <div className="mapview__popup">
                  <div className="mapview__popup-header">
                    <span className={`badge badge-${marker.severity}`}>{marker.severity}</span>
                    <span className={`badge badge-${marker.status}`}>{marker.status?.replace('_',' ')}</span>
                  </div>
                  <h4>{marker.title || marker.issue_type?.replace('_', ' ')}</h4>
                  {marker.reference_no && (
                    <p className="mapview__popup-ref">{marker.reference_no}</p>
                  )}
                  {marker.thumbnail && (
                    <img src={marker.thumbnail} alt="" className="mapview__popup-img" />
                  )}
                  <Link to={`/complaint/${marker.id}`} className="btn btn-primary btn-sm btn-full">
                    View Details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
