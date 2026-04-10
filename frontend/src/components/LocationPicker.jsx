import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Crosshair, Loader } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './LocationPicker.css';

// Fix Leaflet default icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

function MapClickHandler({ onSelect }) {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function LocationPicker({ onLocationSelect, initialLat, initialLng }) {
  const [position, setPosition] = useState(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  const defaultCenter = [12.9716, 77.5946]; // Bangalore default

  const handleMapClick = (lat, lng) => {
    setPosition({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onLocationSelect?.({ lat, lng, address: addr });
    } catch (_) {
      onLocationSelect?.({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    }
  };

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
        setPosition({ lat, lng });
        setAccuracy(acc);
        reverseGeocode(lat, lng);
        setLocating(false);
      },
      () => { setLocating(false); alert('Location access denied'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="location-picker">
      <div className="location-picker__controls">
        <button
          type="button"
          className={`btn btn-secondary btn-sm ${locating ? 'loading' : ''}`}
          onClick={detectLocation}
          disabled={locating}
        >
          {locating ? <div className="spinner spinner-sm" /> : <Crosshair size={14} />}
          {locating ? 'Locating…' : 'Use My Location'}
        </button>
        {position && (
          <span className="location-picker__coords">
            <MapPin size={12} />
            {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            {accuracy && <span className="location-picker__accuracy">±{Math.round(accuracy)}m</span>}
          </span>
        )}
      </div>

      <div className="location-picker__map">
        <MapContainer
          center={position ? [position.lat, position.lng] : defaultCenter}
          zoom={14}
          style={{ height: 320, width: '100%', borderRadius: 'var(--radius-lg)' }}
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          />
          <MapClickHandler onSelect={handleMapClick} />
          {position && (
            <>
              <Marker position={[position.lat, position.lng]} icon={selectedIcon}>
                <Popup>Issue location</Popup>
              </Marker>
              {accuracy && (
                <Circle
                  center={[position.lat, position.lng]}
                  radius={accuracy}
                  pathOptions={{ color: 'var(--primary)', fillOpacity: 0.1 }}
                />
              )}
            </>
          )}
        </MapContainer>
        <p className="location-picker__hint">📍 Click anywhere on the map to set exact location</p>
      </div>
    </div>
  );
}
