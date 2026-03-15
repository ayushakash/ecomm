import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Reusable Map Component
 *
 * Props:
 *   mode             - "pick" | "view"
 *   initialCenter    - { lat, lng }
 *   markerPosition   - { lat, lng }
 *   onLocationSelect - (lat, lng) => void  (pick mode only)
 *   markerLabel      - string popup text   (view mode)
 *   height           - CSS height string, default "400px"
 */
const MapComponent = ({
  mode = 'pick',
  initialCenter,
  markerPosition,
  onLocationSelect,
  markerLabel,
  height = '400px',
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [locating, setLocating] = useState(false);

  const defaultCenter = initialCenter || { lat: 22.9734, lng: 78.6569 };

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [defaultCenter.lat, defaultCenter.lng],
      zoom: initialCenter ? 15 : 5,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    setIsReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Place/move marker when markerPosition changes or map becomes ready
  useEffect(() => {
    if (!isReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const pos = markerPosition;
    if (!pos) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([pos.lat, pos.lng]);
    } else {
      const marker = L.marker([pos.lat, pos.lng], {
        draggable: mode === 'pick',
      }).addTo(map);

      if (mode === 'pick') {
        marker.on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng();
          onLocationSelect?.(lat, lng);
        });
      }

      if (markerLabel) {
        marker.bindPopup(markerLabel).openPopup();
      }

      markerRef.current = marker;
    }

    map.setView([pos.lat, pos.lng], map.getZoom() < 13 ? 15 : map.getZoom());
  }, [isReady, markerPosition, mode, onLocationSelect, markerLabel]);

  // Click handler for pick mode
  useEffect(() => {
    if (!isReady || mode !== 'pick' || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const handleClick = (e) => {
      const { lat, lng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', (ev) => {
          const pos = ev.target.getLatLng();
          onLocationSelect?.(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }

      onLocationSelect?.(lat, lng);
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [isReady, mode, onLocationSelect]);

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const map = mapInstanceRef.current;

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], { draggable: mode === 'pick' }).addTo(map);
          if (mode === 'pick') {
            marker.on('dragend', (e) => {
              const p = e.target.getLatLng();
              onLocationSelect?.(p.lat, p.lng);
            });
          }
          markerRef.current = marker;
        }

        map.setView([lat, lng], 16);
        if (mode === 'pick') onLocationSelect?.(lat, lng);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden' }}
      />

      {/* Locate Me button — bottom-right, above zoom controls */}
      {mode === 'pick' && (
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          title="Go to my current location"
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '10px',
            zIndex: 1000,
            width: '34px',
            height: '34px',
            background: 'white',
            border: '2px solid rgba(0,0,0,0.2)',
            borderRadius: '4px',
            cursor: locating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 5px rgba(0,0,0,0.3)',
          }}
        >
          {locating ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5">
              <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
              <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

export default MapComponent;
