import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { merchantAPI, addressAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { reverseGeocode } from '../services/geocodingService';
import { normalizeCityName } from '../utils/cityNameMapping';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [nearbyMerchants, setNearbyMerchants] = useState([]);
  const [merchantIds, setMerchantIds] = useState([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityMerchantIds, setCityMerchantIds] = useState([]);

  // Fetch user addresses when user logs in
  useEffect(() => {
    if (user) {
      fetchAddresses();
      // Clear guest city state when user logs in
      setSelectedCity(null);
      setCityMerchantIds([]);
    } else {
      setAddresses([]);
      setSelectedAddress(null);
      setNearbyMerchants([]);
      setMerchantIds([]);
    }
  }, [user]);

  // Restore saved city for returning guest users
  useEffect(() => {
    if (!authLoading && !user) {
      const savedCity = localStorage.getItem('selectedCity');
      if (savedCity) {
        try {
          const cityData = JSON.parse(savedCity);
          fetchMerchantsByCity(cityData.city, cityData.state);
        } catch {
          localStorage.removeItem('selectedCity');
        }
      }
    }
  }, [authLoading, user]);

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
      const hasCoordinates = address.coordinates?.latitude && address.coordinates?.longitude;

      if (!hasCoordinates) {
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

      setNearbyMerchants(response.merchants || []);
      setMerchantIds((response.merchants || []).map(m => m._id));

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

  // Handle address change
  const handleAddressChange = async (address) => {
    if (!address) return;
    setSelectedAddress(address);
    localStorage.setItem('selectedAddressId', address._id);
    await fetchNearbyMerchants(address);
  };

  const clearSelectedAddress = () => {
    setSelectedAddress(null);
    setNearbyMerchants([]);
    setMerchantIds([]);
    setLocationInfo(null);
    localStorage.removeItem('selectedAddressId');
  };

  const refreshMerchants = async () => {
    if (selectedAddress) {
      await fetchNearbyMerchants(selectedAddress);
    }
  };

  // Fetch merchants by city (for guest users)
  const fetchMerchantsByCity = async (cityName, stateName) => {
    setIsLoadingMerchants(true);
    try {
      const response = await merchantAPI.getMerchants({
        city: cityName,
        state: stateName,
        activeStatus: 'approved'
      });

      const merchants = response.merchants || [];
      setCityMerchantIds(merchants.map(m => m._id));
      setSelectedCity({ city: cityName, state: stateName, merchantCount: merchants.length });

      // Persist for returning visits
      localStorage.setItem('selectedCity', JSON.stringify({ city: cityName, state: stateName }));

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
          `No merchants currently serving ${cityName}. We're expanding to new cities soon!`,
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

  const clearSelectedCity = () => {
    setSelectedCity(null);
    setCityMerchantIds([]);
    setLocationInfo(null);
    localStorage.removeItem('selectedCity');
  };

  // Request browser GPS location
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
          try {
            toast.loading('Finding your city...', { id: 'location' });
            const addressData = await reverseGeocode(latitude, longitude);

            if (addressData.success && addressData.city) {
              const normalizedCity = normalizeCityName(addressData.city);

              const cityData = {
                city: normalizedCity,
                state: addressData.state,
                area: addressData.area,
                pincode: addressData.pincode,
                formattedAddress: addressData.formattedAddress,
                coordinates: [longitude, latitude]
              };

              setSelectedCity(cityData);

              toast.loading('Finding merchants in your city...', { id: 'location' });
              await fetchMerchantsByCity(normalizedCity, addressData.state);
              toast.dismiss('location');
              resolve(addressData);
            } else {
              throw new Error('Could not determine city from location');
            }
          } catch (geocodeError) {
            console.error('Geocoding error:', geocodeError);
            toast.error('Could not determine your city. Please select manually.', { id: 'location' });
            reject(geocodeError);
          }
        },
        (error) => {
          console.error('Location error:', error);
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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
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
    requestLocationPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export default LocationContext;
