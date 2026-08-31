import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { supabase } from '@/lib/supabase';

// Consent-based live location sharing — the device half. The student
// toggles this on from the Home screen (app/(tabs)/index.tsx via
// use-live-sharing.ts); while a session is active their device pushes a
// point to public.live_locations roughly every 12s, and their accepted
// guardians watch those arrive over Realtime. Toggling off stops the
// updates and flips the session inactive.
//
// Two delivery paths depending on the permission the user granted:
//   * 'background' — "Allow all the time": expo-task-manager +
//     Location.startLocationUpdatesAsync with an Android foreground
//     service, so updates keep flowing while the phone is locked. The
//     foreground-service notification is what keeps this non-covert; we
//     never suppress it.
//   * 'foreground' — only "While using the app": Location.watchPositionAsync
//     in the app's own JS context, no background task. Updates pause when
//     the app is backgrounded — the caller shows a visible warning for
//     this. (startLocationUpdatesAsync is NOT usable here: without a
//     foreground service it needs ACCESS_BACKGROUND_LOCATION, which is
//     exactly what wasn't granted.)
//
// This module is UI-agnostic, like sos-trigger.ts — no React, no t(). The
// one piece of user-facing text it needs (the Android notification) is
// passed in by the caller, already translated.
//
// TaskManager.defineTask below runs at module scope. This module is
// imported from the custom entry point (mobile/index.js) so that runs on
// EVERY JS launch, headless ones included — see that file for why that
// matters.

export const LIVE_SHARING_TASK = 'safepath-live-location-sharing';

// The active session id, mirrored to AsyncStorage so the headless task
// (which may be relaunched into a fresh JS context by the OS, with no
// access to React state) knows which session to write points to. Cleared
// only once the DB confirms the session is inactive.
const SESSION_ID_KEY = 'safepath.liveSharing.sessionId';

const PING_INTERVAL_MS = 12000;
const PING_DISTANCE_M = 10;

// A delivered fix older than this is rejected, not written. Android hands
// back the OS's cached "last known location" as the first callback after
// (re)subscribing — with its ORIGINAL timestamp, which can be hours or a
// full day old if the device hasn't had a real fix recently. Writing that
// would show a guardian a position the person left long ago, labelled as
// recent. 2 min is well above any real jitter (updates are every ~12s) and
// below the guardian-side 3-min "not updating" threshold.
const MAX_FIX_AGE_MS = 2 * 60 * 1000;
// A fix whose timestamp is further in the future than this means the
// device clock is badly wrong — its timestamps can't be trusted at all,
// so reject. (A few seconds of "future" is normal clock jitter and is
// handled by clamping recorded_at to now instead.)
const MAX_FIX_FUTURE_SKEW_MS = 60 * 1000;

export type LiveSharingMode = 'background' | 'foreground';

export type StartLiveSharingResult =
  | { ok: true; sessionId: string }
  | { ok: false; reason: 'already-active-elsewhere' | 'error'; message?: string };

type ForegroundServiceText = {
  notificationTitle: string;
  notificationBody: string;
};

// Foreground-mode watcher subscription (null unless a foreground-mode
// session is currently running in this JS context). Background mode uses
// the OS task instead and leaves this null.
let foregroundSubscription: Location.LocationSubscription | null = null;

// Whether startTracking() has actually run in THIS JS process. The native
// Location.hasStartedLocationUpdatesAsync() flag is persisted and survives
// process death, so after a force-stop / OEM battery-kill / low-memory
// kill it can read `true` while the underlying request and foreground
// service are gone (and, before the entry-point fix, while the task had
// been auto-unregistered). On a fresh process we therefore treat tracking
// as NOT active until we've re-issued startLocationUpdatesAsync ourselves.
let trackingStartedThisProcess = false;

async function getStoredSessionId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SESSION_ID_KEY);
  } catch {
    return null;
  }
}

async function setStoredSessionId(sessionId: string | null): Promise<void> {
  try {
    if (sessionId) {
      await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
    } else {
      await AsyncStorage.removeItem(SESSION_ID_KEY);
    }
  } catch {
    // Non-fatal: the DB session row is the source of truth. Worst case the
    // headless task can't find the id and skips a tick until the hook
    // re-syncs it on next app focus.
  }
}

// Shared by both the background task and the foreground watcher.
async function writeLocationPoint(
  sessionId: string,
  location: Location.LocationObject
): Promise<void> {
  const now = Date.now();
  const age = now - location.timestamp;

  if (age > MAX_FIX_AGE_MS || age < -MAX_FIX_FUTURE_SKEW_MS) {
    // Stale cached fix, or a device with a badly-wrong clock. Skip it and
    // wait for a real fix — the watcher will deliver one once GPS gets a
    // lock. A guardian sees "waiting" / "not updating" in the meantime,
    // which is the honest state.
    console.warn(
      `[live-sharing] ignoring a location fix ${Math.round(age / 1000)}s off (session ${sessionId})`
    );
    return;
  }

  const { error } = await supabase.from('live_locations').insert({
    session_id: sessionId,
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    // Stamp from the fix's own time, not server now() — a slightly
    // deferred delivery should reflect the real age of the position. But
    // never store a future time (small clock jitter), so clamp to now.
    recorded_at: new Date(Math.min(location.timestamp, now)).toISOString(),
  });

  if (error) {
    // Most likely causes: the session was flipped inactive elsewhere (RLS
    // WITH CHECK then rejects the insert), or the access token needs a
    // refresh. Log and let the next tick retry — the visible toggle, not
    // this write, is what the user is relying on.
    console.warn('[live-sharing] failed to write location point:', error.message);
  }
}

// --- The background task. Defined at module scope (an expo-task-manager
// hard requirement — the OS may call this before any screen mounts) via
// the side-effect import in app/_layout.tsx. ---
TaskManager.defineTask(LIVE_SHARING_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[live-sharing] location task error:', error.message);
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] } | null)?.locations;
  if (!locations || locations.length === 0) return;

  const sessionId = await getStoredSessionId();
  if (!sessionId) {
    // Sharing was stopped (or never started in this install) — nothing to
    // write to. The task should already be torn down; this is just belt.
    return;
  }

  // On a headless relaunch the OS may fire this before supabase-js has
  // rehydrated its persisted session from AsyncStorage. getSession()
  // awaits that recovery; without it the insert below can go out with only
  // the anon key and be rejected by RLS (the policy is `to authenticated`),
  // silently losing the point. Bail and let the next tick retry once the
  // session is available.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    console.warn('[live-sharing] no auth session yet in background task — skipping this batch');
    return;
  }

  // Only the most recent fix matters — guardians see current position, not
  // a trail, and the 2h cleanup job would purge a dense trail anyway.
  await writeLocationPoint(sessionId, locations[locations.length - 1]);
});

async function stopForegroundWatch(): Promise<void> {
  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }
}

async function startForegroundWatch(sessionId: string): Promise<void> {
  await stopForegroundWatch();
  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: PING_INTERVAL_MS,
      distanceInterval: PING_DISTANCE_M,
    },
    (location) => {
      void writeLocationPoint(sessionId, location);
    }
  );
}

async function stopBackgroundTask(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(LIVE_SHARING_TASK)) {
    try {
      await Location.stopLocationUpdatesAsync(LIVE_SHARING_TASK);
    } catch (err) {
      console.warn('[live-sharing] failed to stop location task:', err);
    }
  }
}

// True only if a delivery path is genuinely running in THIS process — a
// foreground watcher we hold a handle to, or an OS task we started (and
// that the native side still reports as started). A persisted-but-dead
// native "started" flag from a previous process reads as not active, so
// the reconcile path re-establishes tracking on a fresh launch instead of
// trusting it.
export async function isLiveSharingActive(): Promise<boolean> {
  if (foregroundSubscription) return true;
  if (!trackingStartedThisProcess) return false;
  return Location.hasStartedLocationUpdatesAsync(LIVE_SHARING_TASK);
}

// Registers whichever delivery path `mode` calls for. Idempotent — clears
// the other path first, so switching modes (e.g. the user grants "Allow
// all the time" later) is a clean handover.
async function startTracking(
  mode: LiveSharingMode,
  sessionId: string,
  text: ForegroundServiceText
): Promise<void> {
  if (mode === 'background') {
    await stopForegroundWatch();
    await stopBackgroundTask();
    await Location.startLocationUpdatesAsync(LIVE_SHARING_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: PING_INTERVAL_MS,
      distanceInterval: PING_DISTANCE_M,
      // iOS: show the blue "app is using your location" pill — same
      // visible-tracking principle as the Android foreground notification.
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: text.notificationTitle,
        notificationBody: text.notificationBody,
        notificationColor: '#2f95dc',
      },
    });
  } else {
    await stopBackgroundTask();
    await startForegroundWatch(sessionId);
  }
  trackingStartedThisProcess = true;
}

// Creates a fresh live_sharing_sessions row (one per toggle-on, matching
// the alerts/journeys append pattern), persists its id, and starts
// tracking. Returns a result rather than throwing so the toggle UI can
// show a clean message and revert.
export async function startLiveSharing(params: {
  userId: string;
  mode: LiveSharingMode;
  foregroundServiceText: ForegroundServiceText;
}): Promise<StartLiveSharingResult> {
  const { data, error } = await supabase
    .from('live_sharing_sessions')
    .insert({ user_id: params.userId, is_active: true })
    .select('id')
    .single();

  if (error || !data) {
    // 23505 = the live_sharing_sessions_one_active_per_user partial unique
    // index: this user already has an active session, almost always
    // because they started it on another device. Distinct from a generic
    // failure — the UI tells them so rather than offering a pointless
    // "try again".
    if (error?.code === '23505') {
      return { ok: false, reason: 'already-active-elsewhere' };
    }
    return {
      ok: false,
      reason: 'error',
      message: error?.message ?? 'Could not start a sharing session.',
    };
  }

  await setStoredSessionId(data.id);

  try {
    await startTracking(params.mode, data.id, params.foregroundServiceText);
  } catch (err) {
    // Roll the session back so the DB doesn't show an active session with
    // no device actually reporting (e.g. location services disabled at the
    // OS level, or a race with the OS).
    await supabase.from('live_sharing_sessions').update({ is_active: false }).eq('id', data.id);
    await setStoredSessionId(null);
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Could not start location updates.',
    };
  }

  return { ok: true, sessionId: data.id };
}

// Flips the session inactive, THEN tears down the device tracking — in
// that order on purpose. If the DB update fails (transient network), we
// return { ok: false } WITHOUT having stopped anything: the session is
// still genuinely active server-side, so the caller keeps showing "on"
// and lets the user retry, rather than the reconcile path later finding a
// still-active session with no task and silently resuming tracking the
// user meant to stop.
export async function stopLiveSharing(sessionId?: string | null): Promise<{ ok: boolean }> {
  const idToClose = sessionId ?? (await getStoredSessionId());

  if (idToClose) {
    const { error } = await supabase
      .from('live_sharing_sessions')
      .update({ is_active: false })
      .eq('id', idToClose);
    if (error) {
      console.warn('[live-sharing] failed to mark session inactive:', error.message);
      return { ok: false };
    }
  }

  // DB is now inactive (or there was no session at all) — safe to stop the
  // device. RLS already rejects any further inserts at this point, so the
  // brief window before these calls complete is harmless.
  await stopForegroundWatch();
  await stopBackgroundTask();
  await setStoredSessionId(null);
  trackingStartedThisProcess = false;
  return { ok: true };
}

// Re-attach tracking to a session the DB still reports as active (app was
// killed and reopened, or the OS cleared the task / the foreground
// watcher's JS context). Used only by the hook's reconcile path.
export async function resumeLiveSharing(params: {
  sessionId: string;
  mode: LiveSharingMode;
  foregroundServiceText: ForegroundServiceText;
}): Promise<void> {
  await setStoredSessionId(params.sessionId);
  await startTracking(params.mode, params.sessionId, params.foregroundServiceText);
}
