import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { merchantAPI, addressAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { reverseGeocode } from '../services/geocodingService';
import { normalizeCityName, getCityDisplayName } from '../utils/cityNameMapping';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const { user } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [nearbyMerchants, setNearbyMerchants] = useState([]);
  const [merchantIds, setMerchantIds] = useState([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null); // For guest users to filter by city
  const [cityMerchantIds, setCityMerchantIds] = useState([]); // Merchant IDs for selected city
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationPermissionAsked, setLocationPermissionAsked] = useState(false);

  // Check if this is first visit and show location prompt for guests
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    const locationAsked = localStorage.getItem('locationPermissionAsked');

    // For guest users (not logged in), show location modal on first visit
    if (!user && !hasVisited && !locationAsked) {
      // Show location modal after a short delay (let page load first)
      const timer = setTimeout(() => {
        setShowLocationModal(true);
      }, 1500); // 1.5 second delay

      localStorage.setItem('hasVisited', 'true');

      return () => clearTimeout(timer);
    }

    if (locationAsked) {
      setLocationPermissionAsked(true);
    }
  }, [user]);

  // Fetch user addresses when user logs in
  useEffect(() => {
    if (user) {
      fetchAddresses();
    } else {
      setAddresses([]);
      setSelectedAddress(null);
      setNearbyMerchants([]);
      setMerchantIds([]);
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const response = await addressAPI.getAllAddresses();
      const userAddresses = response.addresses || [];
      setAddresses(userAddresses);

      // Auto-select default address or first address
      if (userAddresses.length > 0 && !selectedAddress) {
        const defaultAddr = userAddresses.find(addr => addr.isDefault) || userAddresses[0];
        await handleAddressChange(defaultAddr);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    }
  };

  // Fetch nearby merchants when address changes
  const fetchNearbyMerchants = useCallback(async (address) => {
    if (!address || !address.city) {
      console.warn('Address is missing city for merchant search');
      return;
    }

    setIsLoadingMerchants(true);
    try {
      console.log('🔍 Fetching merchants for address:', address);

      // Check if coordinates are available
      const hasCoordinates = address.coordinates?.latitude && address.coordinates?.longitude;

      if (!hasCoordinates) {
        console.warn('⚠️ Address has no coordinates - will use city-wide fallback');
        toast.warning(
          'Exact location not available. Showing all city merchants. ' +
          'Delivery availability will be confirmed by merchant.',
          { duration: 5000 }
        );
      }

      const response = await merchantAPI.getNearbyMerchants({
        addressId: address._id,
        coordinates: hasCoordinates ? address.coordinates : undefined,
        city: address.city,
        area: address.area,
        pincode: address.pincode
      });

      console.log(`✅ Found ${response.merchants?.length || 0} merchants (${response.searchType || 'unknown'})`);

      setNearbyMerchants(response.merchants || []);
      setMerchantIds((response.merchants || []).map(m => m._id));

      // Only set locationInfo if merchants are available
      if (response.count > 0) {
        setLocationInfo({
          searchRadius: response.searchRadius,
          fallbackApplied: response.fallbackApplied,
          merchantCount: response.count
        });
      } else {
        setLocationInfo(null);
        toast.error('No merchants available in your area yet');
      }
    } catch (error) {
      console.error('Failed to fetch nearby merchants:', error);
      toast.error('Failed to load merchants in your area');
      setNearbyMerchants([]);
      setMerchantIds([]);
    } finally {
      setIsLoadingMerchants(false);
    }
  }, []);

  // Handle address change (e.g., user selects different delivery address)
  const handleAddressChange = async (address) => {
    if (!address) return;

    setSelectedAddress(address);
    localStorage.setItem('selectedAddressId', address._id);

    await fetchNearbyMerchants(address);
  };

  // Clear selected address
  const clearSelectedAddress = () => {
    setSelectedAddress(null);
    setNearbyMerchants([]);
    setMerchantIds([]);
    setLocationInfo(null);
    localStorage.removeItem('selectedAddressId');
  };

  // Refresh merchants (useful after settings change)
  const refreshMerchants = async () => {
    if (selectedAddress) {
      await fetchNearbyMerchants(selectedAddress);
    }
  };

  // Fetch merchants by city (for guest users)
  const fetchMerchantsByCity = async (cityName, stateName) => {
    setIsLoadingMerchants(true);
    try {
      console.log('🔍 Fetching merchants for city:', cityName, stateName);

      // Fetch all approved merchants and filter by city
      const response = await merchantAPI.getMerchants({
        city: cityName,
        state: stateName,
        activeStatus: 'approved'
      });

      const merchants = response.merchants || [];
      console.log(`✅ Found ${merchants.length} merchants in ${cityName}`);

      setCityMerchantIds(merchants.map(m => m._id));
      setSelectedCity({ city: cityName, state: stateName, merchantCount: merchants.length });

      // Only set locationInfo if merchants are available
      if (merchants.length > 0) {
        setLocationInfo({
          searchRadius: 'City-wide',
          fallbackApplied: false,
          merchantCount: merchants.length
        });
        toast.success(`Found ${merchants.length} merchants in ${cityName}!`);
      } else {
        setLocationInfo(null);
        toast.error(
          `No merchants currently serving ${cityName}. We're expanding to new cities soon! Try selecting a different city from the menu.`,
          { duration: 6000 }
        );
      }
    } catch (error) {
      console.error('Failed to fetch merchants by city:', error);
      toast.error('Failed to load merchants');
      setCityMerchantIds([]);
    } finally {
      setIsLoadingMerchants(false);
    }
  };

  // Clear selected city
  const clearSelectedCity = () => {
    setSelectedCity(null);
    setCityMerchantIds([]);
    setLocationInfo(null);
  };

  // Request browser location permission
  const requestLocationPermission = async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser');
        reject(new Error('Geolocation not supported'));
        return;
      }

      toast.loading('Getting your location...', { id: 'location' });

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('📍 Location obtained:', { latitude, longitude });

          try {
            // Geocode the coordinates to get city and address
            toast.loading('Finding your city...', { id: 'location' });
            const addressData = await reverseGeocode(latitude, longitude);

            if (addressData.success && addressData.city) {
              console.log('🏙️ Raw city from geocoding:', addressData.city);

              // Normalize city name to handle variations (Bengaluru -> Bangalore)
              const normalizedCity = normalizeCityName(addressData.city);
              const displayCity = getCityDisplayName(addressData.city);

              console.log('🏙️ Normalized city:', normalizedCity);
              console.log('🏙️ Display city:', displayCity);

              // Save location data
              localStorage.setItem('locationPermissionAsked', 'true');
              localStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));
              setLocationPermissionAsked(true);
              setShowLocationModal(false);

              // Set selected city for guest users (use normalized name)
              const cityData = {
                city: normalizedCity,  // Use normalized name for database queries
                state: addressData.state,
                area: addressData.area,
                pincode: addressData.pincode,
                formattedAddress: addressData.formattedAddress,
                coordinates: [longitude, latitude]
              };

              setSelectedCity(cityData);

              // Fetch merchants based on normalized city name (city-wide for guests)
              toast.loading('Finding merchants in your city...', { id: 'location' });
              await fetchMerchantsByCity(normalizedCity, addressData.state);

              toast.success(`Location set to ${displayCity}!`, { id: 'location' });
              resolve(addressData);
            } else {
              throw new Error('Could not determine city from location');
            }
          } catch (geocodeError) {
            console.error('Geocoding error:', geocodeError);
            localStorage.setItem('locationPermissionAsked', 'true');
            setLocationPermissionAsked(true);
            setShowLocationModal(false);

            toast.error('Could not determine your city. Please select manually.', { id: 'location' });
            reject(geocodeError);
          }
        },
        (error) => {
          console.error('Location error:', error);
          localStorage.setItem('locationPermissionAsked', 'true');
          setLocationPermissionAsked(true);
          setShowLocationModal(false);

          let errorMessage = 'Unable to get location';
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location permission denied. You can enable it in browser settings.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'Location information unavailable';
          } else if (error.code === error.TIMEOUT) {
            errorMessage = 'Location request timed out';
          }

          toast.error(errorMessage, { id: 'location' });
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  // Skip location permission
  const skipLocationPermission = () => {
    localStorage.setItem('locationPermissionAsked', 'true');
    setLocationPermissionAsked(true);
    setShowLocationModal(false);
    toast('You can enable location anytime from your profile', { icon: 'ℹ️' });
  };

  const value = {
    selectedAddress,
    setSelectedAddress: handleAddressChange,
    nearbyMerchants,
    merchantIds,
    isLoadingMerchants,
    locationInfo,
    addresses,
    clearSelectedAddress,
    refreshMerchants,
    fetchAddresses,
    selectedCity,
    cityMerchantIds,
    fetchMerchantsByCity,
    clearSelectedCity,
    showLocationModal,
    requestLocationPermission,
    skipLocationPermission
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export default LocationContext;
