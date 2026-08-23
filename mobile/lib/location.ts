import * as Location from 'expo-location';

const LOCATION_FETCH_TIMEOUT_MS = 10000;

export type Coordinates = { lat: number; lng: number };

// Never throws — returns null on any failure (permission not granted, GPS
// unavailable, timed out, etc). An SOS alert without a location is still
// far better than no alert at all, so callers should proceed with null
// rather than block the SOS flow on this.
export async function getBestEffortLocation(): Promise<Coordinates | null> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return null;

    const result = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOCATION_FETCH_TIMEOUT_MS)),
    ]);

    if (!result) return null;
    return { lat: result.coords.latitude, lng: result.coords.longitude };
  } catch {
    return null;
  }
}
