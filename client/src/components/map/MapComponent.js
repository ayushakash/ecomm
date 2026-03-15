import React, { useEffect, useRef, useState } from 'react';

// Fix leaflet default marker icon (webpack asset issue)
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
 *   mode          - "pick" | "view"
 *                   pick: user can click/drag to select a location
 *                   view: read-only, shows a fixed pin at given coordinates
 *
 *   initialCenter - { lat, lng } — default center of the map
 *                   Falls back to center of India if not provided
 *
 *   markerPosition - { lat, lng } — pre-existing pin position (optional in pick mode)
 *
 *   onLocationSelect - (lat, lng) => void — called when user picks a location (pick mode only)
 *
 *   markerLabel   - string shown in popup on the pin (view mode)
 *
 *   height        - CSS height string, default "400px"
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

  const defaultCenter = initialCenter || { lat: 22.9734, lng: 78.6569 }; // center of India

  useEffect(() => {
    if (mapInstanceRef.current) return; // already initialised

    const map = L.map(mapRef.current, {
      center: [defaultCenter.lat, defaultCenter.lng],
      zoom: initialCenter ? 15 : 5,
      zoomControl: true,
    });

    // OpenStreetMap tiles — good quality, free
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

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}
    />
  );
};

export default MapComponent;
