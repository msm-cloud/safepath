import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type LocationPermissionStatus = 'checking' | 'granted' | 'denied';

// Requests foreground location permission once, the first time this hook
// mounts with no prior decision recorded — never re-prompts on subsequent
// visits once the user has made a choice (repeatedly re-asking is bad UX,
// and a no-op on iOS after the first denial anyway). The rationale shown
// in the native OS prompt is configured via the expo-location plugin in
// app.json.
export function useLocationPermission(): LocationPermissionStatus {
  const [status, setStatus] = useState<LocationPermissionStatus>('checking');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const current = await Location.getForegroundPermissionsAsync();
      if (cancelled) return;

      if (current.granted) {
        setStatus('granted');
        return;
      }

      if (!current.canAskAgain) {
        setStatus('denied');
        return;
      }

      const requested = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      setStatus(requested.granted ? 'granted' : 'denied');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
