import { useCallback, useRef, useState } from 'react';
import { useLocation } from '../../../contexts/LocationContext';
import type { GeocodedPlace } from '../../../types/models';

/**
 * "Use my current location" with a busy flag (web handleUseCurrentLocation).
 * requestLocationPermission already toasts success and failure; resolves null on failure.
 */
export function useDetectLocation() {
  const { requestLocationPermission } = useLocation();
  const [detecting, setDetecting] = useState(false);
  const inFlight = useRef(false);

  const detect = useCallback(async (): Promise<GeocodedPlace | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setDetecting(true);
    try {
      return await requestLocationPermission();
    } finally {
      inFlight.current = false;
      setDetecting(false);
    }
  }, [requestLocationPermission]);

  return { detecting, detect };
}
