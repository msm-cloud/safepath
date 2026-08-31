import * as Location from 'expo-location';

const LOCATION_FETCH_TIMEOUT_MS = 10000;

export type Coordinates = { lat: number; lng: number };

// Outcome of asking for the permissions live location sharing needs:
//   'granted'         — foreground + background ("Allow all the time"): the
//                       full feature, updates keep flowing while locked.
//   'foreground-only' — foreground granted, background not: we can still
//                       share, but only while the app is open. The caller
//                       is expected to show a visible warning in this case.
//   'denied'          — not even foreground: sharing can't start at all.
export type LiveSharingPermission = 'granted' | 'foreground-only' | 'denied';

// Imperative (not a hook) — called from the Home-screen toggle at the
// moment the user turns sharing ON, unlike useLocationPermission() which
// runs passively on mount for the SOS screen. On Android 11+ the OS will
// not show the background ("Allow all the time") dialog inline; the system
// instead routes the user to Settings, so a 'foreground-only' result here
// is common and expected rather than a hard failure — the toggle should
// fall back to foreground sharing plus a warning, and point the user at
// Settings if they want the full thing.
export async function requestLiveSharingPermissions(): Promise<LiveSharingPermission> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return 'denied';

  const background = await Location.requestBackgroundPermissionsAsync();
  return background.granted ? 'granted' : 'foreground-only';
}

// Current state without prompting — used by the hook on reconcile (app
// reopened mid-session) to decide whether the still-active session should
// resume in background or foreground-only mode.
export async function getLiveSharingPermission(): Promise<LiveSharingPermission> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) return 'denied';

  const background = await Location.getBackgroundPermissionsAsync();
  return background.granted ? 'granted' : 'foreground-only';
}

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
