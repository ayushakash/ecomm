import React, { useState } from 'react';

const LocationConfirmation = ({ onLocationConfirm, customerAddress }) => {
  const [loading, setLoading] = useState(false);
  const [manualLocation, setManualLocation] = useState(customerAddress || '');
  const [locationMethod, setLocationMethod] = useState('manual'); // 'current' or 'manual'

  const getCurrentLocation = () => {
    setLoading(true);
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          coordinates: [position.coords.longitude, position.coords.latitude],
          address: manualLocation || customerAddress,
          isCurrentLocation: true,
          accuracy: position.coords.accuracy
        };
        
        console.log('Current location obtained:', location);
        onLocationConfirm(location);
        setLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to get your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access was denied. Please enable location services and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        
        alert(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const useManualLocation = () => {
    if (!manualLocation.trim()) {
      alert('Please enter a delivery address');
      return;
    }

    const location = {
      coordinates: [0, 0], // Will be geocoded on backend if needed
      address: manualLocation.trim(),
      isCurrentLocation: false
    };

    console.log('Manual location set:', location);
    onLocationConfirm(location);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">📍 Delivery Location</h3>
      <p className="text-sm text-blue-700 mb-4">
        Using your current location helps us find the nearest merchants for faster delivery!
      </p>

      <div className="space-y-4">
        {/* Location Method Selection */}
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="current"
              checked={locationMethod === 'current'}
              onChange={(e) => setLocationMethod(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm font-medium">Use Current Location</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="manual"
              checked={locationMethod === 'manual'}
              onChange={(e) => setLocationMethod(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm font-medium">Enter Address Manually</span>
          </label>
        </div>

        {/* Address Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Address
          </label>
          <textarea
            value={manualLocation}
            onChange={(e) => setManualLocation(e.target.value)}
            placeholder="Enter your complete delivery address..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="3"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {locationMethod === 'current' ? (
            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Getting Location...
                </>
              ) : (
                <>
                  📍 Use Current Location (Recommended)
                </>
              )}
            </button>
          ) : (
            <button
              onClick={useManualLocation}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              ✅ Confirm Address
            </button>
          )}
        </div>

        {/* Benefits */}
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-sm text-green-800">
            <span className="font-medium">Benefits of accurate location:</span>
            <ul className="mt-1 ml-4 list-disc text-xs">
              <li>Faster merchant assignment</li>
              <li>More accurate delivery estimates</li>
              <li>Better order completion rates</li>
              <li>Reduced delivery charges</li>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationConfirmation;