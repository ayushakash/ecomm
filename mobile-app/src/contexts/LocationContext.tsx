/**
 * Where the customer is and which merchants serve them.
 * Port of client/src/contexts/LocationContext.js:
 *  - Logged-in users: selected saved address → POST /merchants/nearby.
 *  - Guests: persisted city (or GPS coords) → merchants by city / nearby;
 *    first-time guests get the serviceable city with the most stores (never walled off).
 * Product queries filter by `activeMerchantIds`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addressAPI, merchantAPI } from '../services/api';
import { reverseGeocode } from '../services/geocoding';
import type { Address, Coordinates, GeocodedPlace, Merchant } from '../types/models';
import { normalizeCityName } from '../utils/cityName';
import { toast } from '../utils/toast';
import { useAuth } from './AuthContext';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';


export const DEFAULT_GUEST_CITY = { city: 'Ranchi', state: 'Jharkhand' } as const;

const SELECTED_CITY_KEY = 'chardeevari.selectedCity';
const SELECTED_ADDRESS_KEY = 'chardeevari.selectedAddressId';

export interface SelectedCity {
  city: string;
  state?: string;
  area?: string;
  pincode?: string;
  formattedAddress?: string;
  /** Present for GPS-located guests: serviceability is matched by coordinates. */
  coordinates?: Coordinates;
  merchantCount?: number;
}

export interface LocationInfo {
  searchRadius: number | string;
  fallbackApplied: boolean;
  merchantCount: number;
}

interface FetchOptions {
  /** Background/automatic call: suppress all toasts. */
  silent?: boolean;
}

export interface LocationContextValue {
  // Logged-in, address-based
  addresses: Address[];
  selectedAddress: Address | null;
  /** Select an address and match merchants for it (persists the choice). */
  setSelectedAddress(address: Address): Promise<void>;
  clearSelectedAddress(): void;
  /** Reload saved addresses (call after create/update/delete). Auto-selects saved/default/first. */
  fetchAddresses(): Promise<Address[]>;
  nearbyMerchants: Merchant[];
  merchantIds: string[];
  refreshMerchants(): Promise<void>;

  // Guest / city-based
  selectedCity: SelectedCity | null;
  cityMerchantIds: string[];
  fetchMerchantsByCity(city: string, state?: string, options?: FetchOptions): Promise<number>;
  /** Match merchants by exact coordinates (GPS or map pin) and persist as the guest location. */
  fetchMerchantsByCoordinates(place: SelectedCity & { coordinates: Coordinates }, options?: FetchOptions): Promise<number>;
  clearSelectedCity(): void;
  /** Ask for GPS permission, reverse-geocode, then match merchants. Resolves null on failure (toasted). */
  requestLocationPermission(): Promise<GeocodedPlace | null>;

  // Derived
  isLoadingMerchants: boolean;
  locationInfo: LocationInfo | null;
  /** Merchant filter for product queries: address-based → city-based → undefined (no filter). */
  activeMerchantIds: string[] | undefined;
  /** City used for cart city-lock (web ProductCard.getCurrentCity). */
  currentCity: string | null;
  /** Short label for the header LocationChip, e.g. "Home · Kanke" or "Ranchi". */
  locationLabel: string;
  /** Secondary line for the LocationChip (full address / state). */
  locationSubtitle: string;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export const useLocation = (): LocationContextValue => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within a LocationProvider');
  return ctx;
};

const hasCoords = (c?: Partial<Coordinates>): c is Coordinates => !!c?.latitude && !!c?.longitude;

const isSelectedCity = (value: unknown): value is SelectedCity =>
  !!value && typeof value === 'object' && 'city' in value && typeof value.city === 'string';

const persistCity = (city: SelectedCity) => {
  const { merchantCount: _omit, ...stored } = city;
  AsyncStorage.setItem(SELECTED_CITY_KEY, JSON.stringify(stored)).catch(() => {});
};

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation('common');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddressState] = useState<Address | null>(null);
  const [nearbyMerchants, setNearbyMerchants] = useState<Merchant[]>([]);
  const [merchantIds, setMerchantIds] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [cityMerchantIds, setCityMerchantIds] = useState<string[]>([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const selectedAddressRef = useRef<Address | null>(null);
  selectedAddressRef.current = selectedAddress;

  const fetchNearbyMerchants = useCallback(async (address: Address) => {
    if (!address.city) return;
    setIsLoadingMerchants(true);
    try {
      const withCoords = hasCoords(address.coordinates);
      if (!withCoords) {
        toast.info(
          i18n.t('common:location.exactUnavailable'),
          i18n.t('common:location.exactUnavailableBody'),
          5000,
        );
      }
      const response = await merchantAPI.getNearbyMerchants({
        addressId: address._id,
        coordinates: withCoords ? address.coordinates : undefined,
        city: address.city,
        area: address.area,
        pincode: address.pincode,
      });
      const merchants = response.merchants || [];
      setNearbyMerchants(merchants);
      setMerchantIds(merchants.map((m) => m._id));
      if (response.count > 0) {
        setLocationInfo({
          searchRadius: response.searchRadius,
          fallbackApplied: response.fallbackApplied,
          merchantCount: response.count,
        });
      } else {
        setLocationInfo(null);
        toast.error(i18n.t('common:location.noMerchantsArea'));
      }
    } catch {
      toast.error(i18n.t('common:location.loadAreaFailed'));
      setNearbyMerchants([]);
      setMerchantIds([]);
    } finally {
      setIsLoadingMerchants(false);
    }
  }, []);

  const setSelectedAddress = useCallback(
    async (address: Address) => {
      setSelectedAddressState(address);
      AsyncStorage.setItem(SELECTED_ADDRESS_KEY, address._id).catch(() => {});
      await fetchNearbyMerchants(address);
    },
    [fetchNearbyMerchants],
  );

  const clearSelectedAddress = useCallback(() => {
    setSelectedAddressState(null);
    setNearbyMerchants([]);
    setMerchantIds([]);
    setLocationInfo(null);
    AsyncStorage.removeItem(SELECTED_ADDRESS_KEY).catch(() => {});
  }, []);

  const fetchAddresses = useCallback(async (): Promise<Address[]> => {
    try {
      const list = await addressAPI.getAll();
      setAddresses(list);
      const current = selectedAddressRef.current;
      const stillExists = current && list.find((a) => a._id === current._id);
      if (stillExists) {
        // Keep selection but pick up edits.
        setSelectedAddressState(stillExists);
      } else if (list.length > 0) {
        const savedId = await AsyncStorage.getItem(SELECTED_ADDRESS_KEY);
        const next = list.find((a) => a._id === savedId) || list.find((a) => a.isDefault) || list[0];
        await setSelectedAddress(next);
      } else if (current) {
        clearSelectedAddress();
      }
      return list;
    } catch {
      return [];
    }
  }, [clearSelectedAddress, setSelectedAddress]);

  const fetchMerchantsByCity = useCallback<LocationContextValue['fetchMerchantsByCity']>(
    async (cityName, stateName, { silent = false } = {}) => {
      setIsLoadingMerchants(true);
      try {
        const { merchants = [] } = await merchantAPI.getMerchantsByCity(cityName, stateName);
        setCityMerchantIds(merchants.map((m) => m._id));
        const city: SelectedCity = { city: cityName, state: stateName, merchantCount: merchants.length };
        setSelectedCity(city);
        persistCity(city);
        if (merchants.length > 0) {
          setLocationInfo({ searchRadius: 'City-wide', fallbackApplied: false, merchantCount: merchants.length });
          if (!silent) toast.success(i18n.t('common:location.foundInCity', { count: merchants.length, city: cityName }));
        } else {
          setLocationInfo(null);
          if (!silent) toast.error(i18n.t('common:location.noneInCity', { city: cityName }), i18n.t('common:location.expandingCities'));
        }
        return merchants.length;
      } catch {
        if (!silent) toast.error(i18n.t('common:location.loadFailed'));
        setCityMerchantIds([]);
        return 0;
      } finally {
        setIsLoadingMerchants(false);
      }
    },
    [],
  );

  const fetchMerchantsByCoordinates = useCallback<LocationContextValue['fetchMerchantsByCoordinates']>(
    async (place, { silent = false } = {}) => {
      const { latitude, longitude } = place.coordinates;
      setIsLoadingMerchants(true);
      try {
        const response = await merchantAPI.getNearbyMerchants({
          coordinates: { latitude, longitude },
          city: place.city,
          state: place.state,
          area: place.area,
          pincode: place.pincode,
        });
        const merchants = response.merchants || [];
        setCityMerchantIds(merchants.map((m) => m._id));
        const city: SelectedCity = { ...place, coordinates: { latitude, longitude }, merchantCount: merchants.length };
        setSelectedCity(city);
        persistCity(city);
        if (merchants.length > 0) {
          setLocationInfo({
            searchRadius: response.searchRadius,
            fallbackApplied: response.fallbackApplied,
            merchantCount: merchants.length,
          });
          if (!silent) toast.success(i18n.t('common:location.foundNear', { count: merchants.length }));
        } else {
          setLocationInfo(null);
          if (!silent) toast.error(i18n.t('common:location.noneNear'), i18n.t('common:location.expanding'));
        }
        return merchants.length;
      } catch {
        if (!silent) toast.error(i18n.t('common:location.loadNearFailed'));
        setCityMerchantIds([]);
        return 0;
      } finally {
        setIsLoadingMerchants(false);
      }
    },
    [],
  );

  const clearSelectedCity = useCallback(() => {
    setSelectedCity(null);
    setCityMerchantIds([]);
    setLocationInfo(null);
    AsyncStorage.removeItem(SELECTED_CITY_KEY).catch(() => {});
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<GeocodedPlace | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      toast.error(i18n.t('common:location.permissionDenied'), i18n.t('common:location.enableInSettings'));
      return null;
    }
    try {
      toast.info(i18n.t('common:location.getting'));
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const place = await reverseGeocode(coordinates);
      if (!place?.city) {
        toast.error(i18n.t('common:location.cityUnknown'), i18n.t('common:location.selectManually'));
        return null;
      }
      await fetchMerchantsByCoordinates({
        city: normalizeCityName(place.city),
        state: place.state,
        area: place.area,
        pincode: place.pincode,
        formattedAddress: place.formattedAddress,
        coordinates,
      });
      return place;
    } catch {
      toast.error(i18n.t('common:location.unavailable'), i18n.t('common:location.servicesOn'));
      return null;
    }
  }, [fetchMerchantsByCoordinates]);

  // Logged in → load addresses; logged out → drop address state.
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setSelectedCity(null);
      setCityMerchantIds([]);
      fetchAddresses();
    } else {
      setAddresses([]);
      setSelectedAddressState(null);
      setNearbyMerchants([]);
      setMerchantIds([]);
    }
  }, [authLoading, user, fetchAddresses]);

  // Guests: restore saved city (coords → nearby search), else busiest city, else Ranchi. Silent.
  useEffect(() => {
    if (authLoading || user) return;
    (async () => {
      try {
        const saved: unknown = JSON.parse((await AsyncStorage.getItem(SELECTED_CITY_KEY)) ?? 'null');
        if (isSelectedCity(saved)) {
          if (hasCoords(saved.coordinates)) {
            // Re-resolve names so labels saved by older geocoding (e.g. block "Namkum" as city) self-heal.
            const fresh = await reverseGeocode(saved.coordinates);
            const place = fresh?.city
              ? {
                  ...saved,
                  city: normalizeCityName(fresh.city),
                  state: fresh.state ?? saved.state,
                  area: fresh.area,
                  pincode: fresh.pincode,
                  formattedAddress: fresh.formattedAddress,
                }
              : saved;
            await fetchMerchantsByCoordinates({ ...place, coordinates: saved.coordinates }, { silent: true });
          } else {
            await fetchMerchantsByCity(saved.city, saved.state, { silent: true });
          }
          return;
        }
      } catch {
        await AsyncStorage.removeItem(SELECTED_CITY_KEY);
      }
      try {
        const { cities = [] } = await merchantAPI.getAvailableCities();
        const best = cities.reduce<(typeof cities)[number] | null>(
          (top, c) => (!top || c.merchantCount > top.merchantCount ? c : top),
          null,
        );
        if (best) {
          await fetchMerchantsByCity(best.city, best.state, { silent: true });
          return;
        }
      } catch {
        // fall through to static default
      }
      await fetchMerchantsByCity(DEFAULT_GUEST_CITY.city, DEFAULT_GUEST_CITY.state, { silent: true });
    })();
  }, [authLoading, user, fetchMerchantsByCity, fetchMerchantsByCoordinates]);

  const refreshMerchants = useCallback(async () => {
    if (selectedAddressRef.current) await fetchNearbyMerchants(selectedAddressRef.current);
  }, [fetchNearbyMerchants]);

  const value = useMemo<LocationContextValue>(() => {
    const activeMerchantIds =
      merchantIds.length > 0 ? merchantIds : cityMerchantIds.length > 0 ? cityMerchantIds : undefined;
    const currentCity = user && selectedAddress ? selectedAddress.city : selectedCity?.city ?? null;
    let locationLabel = t('location.selectLocation');
    let locationSubtitle = '';
    if (user && selectedAddress) {
      locationLabel = [selectedAddress.title, selectedAddress.area].filter(Boolean).join(' · ');
      locationSubtitle = [selectedAddress.addressLine1, selectedAddress.city].filter(Boolean).join(', ');
    } else if (selectedCity) {
      locationLabel = selectedCity.area ? `${selectedCity.area}, ${selectedCity.city}` : selectedCity.city;
      locationSubtitle = selectedCity.formattedAddress || selectedCity.state || '';
    }
    return {
      addresses,
      selectedAddress,
      setSelectedAddress,
      clearSelectedAddress,
      fetchAddresses,
      nearbyMerchants,
      merchantIds,
      refreshMerchants,
      selectedCity,
      cityMerchantIds,
      fetchMerchantsByCity,
      fetchMerchantsByCoordinates,
      clearSelectedCity,
      requestLocationPermission,
      isLoadingMerchants,
      locationInfo,
      activeMerchantIds,
      currentCity,
      locationLabel,
      locationSubtitle,
    };
  }, [
    user,
    addresses,
    selectedAddress,
    setSelectedAddress,
    clearSelectedAddress,
    fetchAddresses,
    nearbyMerchants,
    merchantIds,
    refreshMerchants,
    selectedCity,
    cityMerchantIds,
    fetchMerchantsByCity,
    fetchMerchantsByCoordinates,
    clearSelectedCity,
    requestLocationPermission,
    isLoadingMerchants,
    locationInfo,
    t,
  ]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}
