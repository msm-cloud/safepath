import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { supabase } from '@/lib/supabase';

// Recorded live location ("location history") — the device half. Separate
// feature from live-sharing.ts: this records one coarse location snapshot
// every ~5 minutes while the student has the toggle on, into
// public.location_history_points, for a guardian to look back over. Same
// non-covert stance as live sharing — an un-suppressed Android
// foreground-service notification runs the whole time it's recording, and
// the Home card shows a standing banner.
//
// Two write paths, never both feeding a foreground service at once:
//   * Standalone — this module's own tracking, used whenever live sharing
//     is NOT also running. Two sub-modes, chosen by the permission the
//     student granted (same split as live-sharing.ts):
//       - 'background' ("Allow all the time"): an expo-task-manager task
//         plus a 5-minute Location.startLocationUpdatesAsync foreground
//         service, so snapshots keep coming while the app is closed or the
//         phone is locked.
//       - 'foreground' (only "While using the app"):
//         Location.watchPositionAsync in the app's own JS context, no
//         background task and no notification. Snapshots are taken only
//         while SafePath is open; the Home card shows a warning. This is
//         what keeps a background-permission downgrade (routine on Android
//         11+) from silently killing the whole feature.
//   * Piggyback — while live sharing IS running it already holds a
//     foreground service and streams fixes every ~12s; live-sharing.ts
//     calls maybeRecordHistoryPoint() on each of those, throttled to one
//     write per 5 min, and this module's own task stays stopped. Avoids a
//     second persistent notification. use-location-history.ts is the
//     reconciler that starts/stops the standalone task around that.
//
// UI-agnostic, like live-sharing.ts / sos-trigger.ts — no React, no t().
// The one piece of user-facing text (the notification) is passed in by the
// caller, already translated.
//
// TaskManager.defineTask below runs at module scope, and this module is
// imported from the custom entry point (mobile/index.js) so it is defined
// on every JS launch, headless ones included — same hard requirement and
// reasoning as live-sharing.ts.

export const LOCATION_HISTORY_TASK = 'safepath-location-history';

// Mirrored to AsyncStorage so the headless task and the live-sharing
// piggyback path (either of which can run in a fresh JS context with no
// React state) can read the current state. profiles.location_history_enabled
// stays the real source of truth; the hook keeps this flag in sync.
const ENABLED_KEY = 'safepath.locationHistory.enabled';
const LAST_WRITE_KEY = 'safepath.locationHistory.lastWriteAt';

// One snapshot per 5 minutes, from either write path.
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

// Coarser than live sharing's High — a breadcrumb trail doesn't need a hot
// GPS fix, and Balanced leans on the fused/network provider, which is far
// lighter on the battery for a recording that can run for hours.
const HISTORY_ACCURACY = Location.Accuracy.Balanced;

// A delivered fix older than this is dropped rather than recorded — same
// stale "last known location" hazard live-sharing.ts guards against, with
// a looser bound since snapshots are 5 min apart anyway.
const MAX_FIX_AGE_MS = 10 * 60 * 1000;
const MAX_FIX_FUTURE_SKEW_MS = 60 * 1000;

export type LocationHistoryMode = 'background' | 'foreground';

// Whether startLocationHistory() has run in THIS JS process. The native
// hasStartedLocationUpdatesAsync() flag is persisted and survives process
// death, so after an OEM battery-kill it can read `true` while nothing is
// actually running — treat tracking as not active until we've re-issued
// the request ourselves, same as live-sharing.ts.
let trackingStartedThisProcess = false;

// Which sub-mode the standalone path is currently running in (null when
// stopped). Lets isLocationHistoryActive() tell the reconciler when the
// running mode no longer matches the permission the user now has, so it
// can hand over (e.g. background -> foreground after a permission
// downgrade) instead of leaving a dead task in place.
let activeMode: LocationHistoryMode | null = null;

// Foreground-mode watcher subscription (null unless a foreground-mode
// standalone recording is running in this JS context). Background mode
// uses the OS task instead and leaves this null. Same generation-counter
// guard as live-sharing.ts: watchPositionAsync is async, so a stop() that
// runs while a start() is still resolving would otherwise install an
// orphaned watcher that keeps firing.
let foregroundSubscription: Location.LocationSubscription | null = null;
let foregroundWatchGeneration = 0;

async function getEnabledFlag(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

// Called by the hook whenever profiles.location_history_enabled changes so
// the two headless write paths above see the current state.
export async function setLocationHistoryEnabledFlag(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      await AsyncStorage.setItem(ENABLED_KEY, '1');
    } else {
      await AsyncStorage.removeItem(ENABLED_KEY);
    }
  } catch {
    // Non-fatal — the DB column is the real source of truth; worst case a
    // headless write is skipped until the hook re-syncs on next focus.
  }
}

async function getLastWriteAt(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAST_WRITE_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

async function setLastWriteAt(ts: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_WRITE_KEY, String(ts));
  } catch {
    // Non-fatal — worst case the throttle lets an extra snapshot through.
  }
}

async function insertHistoryPoint(location: Location.LocationObject): Promise<void> {
  const now = Date.now();
  const age = now - location.timestamp;
  if (age > MAX_FIX_AGE_MS || age < -MAX_FIX_FUTURE_SKEW_MS) {
    console.warn(`[location-history] skipped — fix ${Math.round(age / 1000)}s off`);
    return;
  }

  // On a headless relaunch the OS may fire the task before supabase-js has
  // rehydrated its persisted session; without a session the insert goes
  // out unauthenticated and RLS (to authenticated) rejects it. Bail and
  // let the next tick retry, same as live-sharing.ts's task.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    console.warn('[location-history] no auth session yet — skipping this snapshot');
    return;
  }

  const { error } = await supabase.from('location_history_points').insert({
    user_id: session.user.id,
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    // Stamp from the fix's own time, clamped to now (never a future time).
    recorded_at: new Date(Math.min(location.timestamp, now)).toISOString(),
  });

  if (error) {
    console.warn(
      `[location-history] insert failed — code=${error.code ?? '?'} message=${error.message}`
    );
    return;
  }
  console.log('[location-history] snapshot recorded');
}

// Throttled write shared by both paths. Stamps the timestamp BEFORE the
// async insert so two fixes arriving close together (e.g. the live-sharing
// stream right at the 5-minute boundary) can't both get through. A failed
// insert just means a gap until the next attempt 5 min later — acceptable
// for a breadcrumb trail.
async function recordThrottled(location: Location.LocationObject): Promise<void> {
  const last = await getLastWriteAt();
  if (Date.now() - last < SNAPSHOT_INTERVAL_MS) return;
  await setLastWriteAt(Date.now());
  await insertHistoryPoint(location);
}

// Called by live-sharing.ts on every live-sharing fix while live sharing
// is running. No-op unless history is enabled; otherwise records at most
// one snapshot per 5 min, so this module's own foreground-service task can
// stay stopped while live sharing already holds one.
export async function maybeRecordHistoryPoint(location: Location.LocationObject): Promise<void> {
  if (!(await getEnabledFlag())) return;
  await recordThrottled(location);
}

console.log(`[location-history] module loaded — registering task ${LOCATION_HISTORY_TASK}`);

TaskManager.defineTask(LOCATION_HISTORY_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[location-history] task error:', error.message);
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] } | null)?.locations;
  if (!locations || locations.length === 0) return;
  if (!(await getEnabledFlag())) return;

  await recordThrottled(locations[locations.length - 1]);
});

// Active only if a delivery path is genuinely running in THIS process — a
// foreground watcher we hold a handle to, or an OS task we started (and
// that the native side still reports as started). Pass `mode` to also
// require that running path to be the mode the caller now wants: a
// mismatch (permission downgraded/upgraded since we started) reads as not
// active, so the reconciler re-establishes tracking in the right mode.
export async function isLocationHistoryActive(mode?: LocationHistoryMode): Promise<boolean> {
  const running = foregroundSubscription
    ? true
    : trackingStartedThisProcess &&
      (await Location.hasStartedLocationUpdatesAsync(LOCATION_HISTORY_TASK));
  if (!running) return false;
  if (mode && activeMode !== mode) return false;
  return true;
}

type ForegroundServiceText = {
  notificationTitle: string;
  notificationBody: string;
};

async function stopForegroundHistoryWatch(): Promise<void> {
  // Invalidate any startForegroundHistoryWatch still in flight, as well as
  // the subscription we currently hold.
  foregroundWatchGeneration += 1;
  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }
}

async function startForegroundHistoryWatch(): Promise<void> {
  await stopForegroundHistoryWatch();
  const generation = foregroundWatchGeneration;
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: HISTORY_ACCURACY,
      timeInterval: SNAPSHOT_INTERVAL_MS,
      // Time-based only — a stationary person still needs a periodic
      // breadcrumb. 0 disables the distance filter.
      distanceInterval: 0,
    },
    (location) => {
      void recordThrottled(location);
    }
  );

  if (generation !== foregroundWatchGeneration) {
    // stopForegroundHistoryWatch (or another start) ran while
    // watchPositionAsync was resolving — this subscription is already
    // orphaned, drop it instead of installing it.
    subscription.remove();
    console.log('[location-history] foreground watcher discarded (superseded before it resolved)');
    return;
  }
  foregroundSubscription = subscription;
  console.log('[location-history] foreground watcher subscribed');
}

// Starts whichever delivery path `mode` calls for. Clears the other path
// first, so switching modes (the user grants "Allow all the time" later,
// or Android downgrades it) is a clean handover.
export async function startLocationHistory(
  mode: LocationHistoryMode,
  text: ForegroundServiceText
): Promise<void> {
  await stopLocationHistory();

  if (mode === 'background') {
    await Location.startLocationUpdatesAsync(LOCATION_HISTORY_TASK, {
      accuracy: HISTORY_ACCURACY,
      timeInterval: SNAPSHOT_INTERVAL_MS,
      // Time-based only — a stationary person still needs a periodic
      // breadcrumb. 0 disables the distance filter.
      distanceInterval: 0,
      // Android: let the OS batch deliveries to cut wake-ups; a few minutes
      // of slack on a 5-minute cadence is fine.
      deferredUpdatesInterval: SNAPSHOT_INTERVAL_MS,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: text.notificationTitle,
        notificationBody: text.notificationBody,
        notificationColor: '#2f95dc',
      },
    });
  } else {
    // No background permission — startLocationUpdatesAsync would throw.
    // Watch from the app's own JS context instead; snapshots stop when the
    // app is backgrounded, which the Home card warns about.
    await startForegroundHistoryWatch();
  }

  trackingStartedThisProcess = true;
  activeMode = mode;
  console.log(`[location-history] standalone tracking started (${mode})`);
}

export async function stopLocationHistory(): Promise<void> {
  await stopForegroundHistoryWatch();
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_HISTORY_TASK)) {
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_HISTORY_TASK);
    } catch (err) {
      console.warn('[location-history] failed to stop task:', err);
    }
  }
  trackingStartedThisProcess = false;
  activeMode = null;
}
