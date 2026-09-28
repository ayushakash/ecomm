import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { merchantAPI, addressAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { reverseGeocode } from '../services/geocodingService';
import { normalizeCityName } from '../utils/cityNameMapping';

// ─── DEFAULT CITY FOR GUEST VISITORS ─────────────────────────────────────────
// Guests must NEVER be walled off from the catalog (GA Jun 2026: ~95% of paid
// mobile visitors bounced on a blocking "select your city" screen). So guests
// are ALWAYS auto-assigned a city and see products instantly:
//   1. Returning guests: their saved city (localStorage).
//   2. First-time guests: the serviceable city with the MOST stores, fetched
//      live from /api/merchants/available-cities — so new customers always
//      land on a city that actually has products.
//   3. If that lookup fails: the static fallback below.
// Guests can always switch city via the Header dropdown or the /products
// picker, or share GPS for precise per-merchant serviceability matching.
export const DEFAULT_GUEST_CITY = { city: 'Ranchi', state: 'Jharkhand' };

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

  // Restore saved city for returning guests; FIRST-TIME guests get the busiest
  // serviceable city (see DEFAULT_GUEST_CITY above) so the catalog renders
  // instantly. Both fetches are silent: no toasts on plain page load.
  useEffect(() => {
    if (!authLoading && !user) {
      const savedCity = localStorage.getItem('selectedCity');
      if (savedCity) {
        try {
          const cityData = JSON.parse(savedCity);
          // GPS-located guests have coordinates persisted — restore via the
          // serviceability search so a page reload keeps their real matches
          // (the display city, e.g. "Namkum", often has no name-matched stores).
          if (cityData.coordinates?.latitude && cityData.coordinates?.longitude) {
            fetchMerchantsByCoordinates(cityData, { silent: true });
          } else {
            fetchMerchantsByCity(cityData.city, cityData.state, { silent: true });
          }
          return;
        } catch {
          localStorage.removeItem('selectedCity');
        }
      }
      // First visit (or corrupt storage): pick the city with the most stores
      // so new customers immediately see a live catalog.
      (async () => {
        try {
          const response = await merchantAPI.getAvailableCities();
          const cities = response.cities || [];
          const best = cities.reduce(
            (top, c) => (!top || c.merchantCount > top.merchantCount ? c : top),
            null
          );
          if (best) {
            fetchMerchantsByCity(best.city, best.state, { silent: true });
            return;
          }
        } catch (error) {
          console.error('Failed to load available cities for guest default:', error);
        }
        fetchMerchantsByCity(DEFAULT_GUEST_CITY.city, DEFAULT_GUEST_CITY.state, { silent: true });
      })();
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

  // Fetch merchants by city (for guest users).
  // `silent: true` = automatic/background call (e.g. the Ranchi guest default
  // on page load) — suppresses all toasts so landing visitors aren't nagged.
  // Explicit user actions (header picker, city selector) stay noisy (default).
  const fetchMerchantsByCity = async (cityName, stateName, { silent = false } = {}) => {
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
        if (!silent) toast.success(`Found ${merchants.length} merchants in ${cityName}!`);
      } else {
        setLocationInfo(null);
        if (!silent) {
          toast.error(
            `No merchants currently serving ${cityName}. We're expanding to new cities soon!`,
            { duration: 6000 }
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch merchants by city:', error);
      if (!silent) toast.error('Failed to load merchants');
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

  // Fetch merchants serviceable at exact coordinates (GPS guests).
  // Coordinates are PRIMARY: merchants match by their own delivery radius via
  // /api/merchants/nearby — the reverse-geocoded city name is only a display
  // label and fallback (geocoders return suburbs like "Namkum" or renamed
  // cities like "Mysuru" that never string-match onboarded merchants).
  const fetchMerchantsByCoordinates = async (cityData, { silent = false } = {}) => {
    const { latitude, longitude } = cityData.coordinates;
    setIsLoadingMerchants(true);
    try {
      const response = await merchantAPI.getNearbyMerchants({
        coordinates: { latitude, longitude },
        city: cityData.city,
        state: cityData.state,
        area: cityData.area,
        pincode: cityData.pincode
      });
      const merchants = response.merchants || [];
      setCityMerchantIds(merchants.map(m => m._id));
      setSelectedCity({ ...cityData, merchantCount: merchants.length });
      // Persist WITH coordinates so reloads keep serviceability matching
      localStorage.setItem('selectedCity', JSON.stringify({
        city: cityData.city,
        state: cityData.state,
        area: cityData.area,
        pincode: cityData.pincode,
        coordinates: { latitude, longitude }
      }));

      if (merchants.length > 0) {
        setLocationInfo({
          searchRadius: response.searchRadius,
          fallbackApplied: response.fallbackApplied,
          merchantCount: merchants.length
        });
        if (!silent) toast.success(`Found ${merchants.length} merchants near you!`, { id: 'location' });
      } else {
        setLocationInfo(null);
        if (!silent) {
          toast.error(
            `No merchants deliver to your location yet. We're expanding soon!`,
            { id: 'location', duration: 6000 }
          );
        }
      }
      return merchants.length;
    } catch (error) {
      console.error('Failed to fetch merchants by coordinates:', error);
      if (!silent) toast.error('Failed to load merchants near you', { id: 'location' });
      setCityMerchantIds([]);
      return 0;
    } finally {
      setIsLoadingMerchants(false);
    }
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
                coordinates: { latitude, longitude }
              };

              toast.loading('Finding merchants near you...', { id: 'location' });
              await fetchMerchantsByCoordinates(cityData);
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
