import React, { useState, useEffect } from 'react';
import { XMarkIcon, MapPinIcon, CheckIcon } from '@heroicons/react/24/outline';
import MapComponent from './MapComponent';
import { reverseGeocode } from '../../services/geocodingService';

/**
 * MapPickerModal
 *
 * Opens a full-screen modal with an interactive map.
 * User clicks or drags a pin to select a location.
 * On confirm, reverse-geocodes the coordinates and returns address data.
 *
 * Props:
 *   isOpen          - boolean
 *   onClose         - () => void
 *   onConfirm       - ({ lat, lng, address }) => void
 *                     address contains: area, city, state, pincode, formattedAddress
 *   initialPosition - { lat, lng } — pre-place the pin if coordinates already exist
 */
const MapPickerModal = ({ isOpen, onClose, onConfirm, initialPosition }) => {
  const [selectedPos, setSelectedPos] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [addressPreview, setAddressPreview] = useState('');
  const [userLocation, setUserLocation] = useState(null);

  // Try to get user's current location to center the map
  useEffect(() => {
    if (!isOpen) return;

    if (initialPosition) {
      setSelectedPos(initialPosition);
      return;
    }

    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {} // silently fall back to India center
    );
  }, [isOpen, initialPosition]);

  const handleLocationSelect = async (lat, lng) => {
    setSelectedPos({ lat, lng });
    setAddressPreview('Fetching address...');
    setGeocoding(true);

    try {
      const result = await reverseGeocode(lat, lng);
      if (result.success) {
        const parts = [result.area, result.city, result.state, result.pincode].filter(Boolean);
        setAddressPreview(parts.join(', ') || result.formattedAddress || 'Location selected');
      } else {
        setAddressPreview(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setAddressPreview(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedPos) return;
    setGeocoding(true);

    try {
      const result = await reverseGeocode(selectedPos.lat, selectedPos.lng);
      onConfirm({
        lat: selectedPos.lat,
        lng: selectedPos.lng,
        address: result.success ? result : null,
      });
    } catch {
      onConfirm({ lat: selectedPos.lat, lng: selectedPos.lng, address: null });
    } finally {
      setGeocoding(false);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedPos(null);
    setAddressPreview('');
    onClose();
  };

  if (!isOpen) return null;

  const mapCenter = initialPosition || userLocation || null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: '95vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MapPinIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Select Location on Map</h2>
              <p className="text-xs text-gray-500">Click on the map or drag the pin to set your location</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Map */}
        <div className="flex-1 px-4 pt-4" style={{ minHeight: 0 }}>
          <MapComponent
            mode="pick"
            initialCenter={mapCenter}
            markerPosition={selectedPos}
            onLocationSelect={handleLocationSelect}
            height="380px"
          />
        </div>

        {/* Address Preview + Confirm */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          {selectedPos ? (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Selected Location</p>
              <p className="text-sm text-gray-800 font-medium">
                {geocoding ? (
                  <span className="flex items-center gap-2 text-gray-500">
                    <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                    Fetching address...
                  </span>
                ) : (
                  addressPreview || `${selectedPos.lat.toFixed(5)}, ${selectedPos.lng.toFixed(5)}`
                )}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedPos.lat.toFixed(6)}, {selectedPos.lng.toFixed(6)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-3 text-center">
              Tap anywhere on the map to drop a pin
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPos || geocoding}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {geocoding ? (
                <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Processing...</>
              ) : (
                <><CheckIcon className="w-4 h-4" /> Confirm Location</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPickerModal;
