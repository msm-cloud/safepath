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

// Target reporting cadence. Driven by time alone — NOT distanceInterval.
// A distance filter (we previously set 10 m) tells Android to withhold
// every fix until the device physically moves that far, so a stationary
// sharer transmitted their initial fix and then nothing, and the guardian
// card flipped to "not updating" after 3 min. A person being followed for
// safety is often deliberately still (waiting, hiding, in a vehicle at a
// light) and must keep transmitting.
const PING_INTERVAL_MS = 12000;
// Android background batching hint: once a fix is delivered, later ones may
// be held and delivered together no sooner than this. Fewer process
// wake-ups while backgrounded; still ~9x under the guardian 3-min
// "not updating" threshold.
const DEFERRED_UPDATE_MS = 20000;

// Live sharing acquires GPS actively (High), not the Balanced/network
// tier. Balanced leans on the fused provider's cached fix, which indoors
// or on a cold start is routinely minutes-to-hours old — every such fix
// then trips MAX_FIX_AGE_MS below and nothing is written at all.
const LIVE_SHARING_ACCURACY = Location.Accuracy.High;

// getCurrentPositionAsync on session start can hang on a cold GPS; cap it
// so a stuck one-shot doesn't leak. The continuous watcher is what the
// session actually relies on — this is only to put a point on the
// guardian's map immediately instead of after the first watcher callback.
const INITIAL_FIX_TIMEOUT_MS = 15000;

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

// Bumped every time a foreground watch is started or stopped. watchPositionAsync
// is async: a stop() that runs while a previous start() is still resolving
// would otherwise leave that resolved subscription installed with nothing
// tracking its lifecycle — an orphaned watcher that keeps firing points
// (and RLS violations) against a session the user already stopped. Each
// startForegroundWatch captures the generation it began in and discards
// its own subscription if the generation moved on before it resolved.
let foregroundWatchGeneration = 0;

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

  console.log(
    `[live-sharing] writeLocationPoint session=${sessionId} fixAge=${Math.round(age / 1000)}s ` +
      `coords=${location.coords.latitude.toFixed(5)},${location.coords.longitude.toFixed(5)} ` +
      `acc=${location.coords.accuracy ?? '?'}m`
  );

  if (age > MAX_FIX_AGE_MS || age < -MAX_FIX_FUTURE_SKEW_MS) {
    // Stale cached fix, or a device with a badly-wrong clock. Skip it and
    // wait for a real fix — the watcher will deliver one once GPS gets a
    // lock. A guardian sees "waiting" / "not updating" in the meantime,
    // which is the honest state.
    console.warn(
      `[live-sharing] SKIPPED insert — fix ${Math.round(age / 1000)}s off (limit ` +
        `${MAX_FIX_AGE_MS / 1000}s stale / ${MAX_FIX_FUTURE_SKEW_MS / 1000}s future), session ${sessionId}`
    );
    return;
  }

  const insertStartedAt = Date.now();
  const { data, error } = await supabase
    .from('live_locations')
    .insert({
      session_id: sessionId,
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      // Stamp from the fix's own time, not server now() — a slightly
      // deferred delivery should reflect the real age of the position. But
      // never store a future time (small clock jitter), so clamp to now.
      recorded_at: new Date(Math.min(location.timestamp, now)).toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    // Most likely causes: the session was flipped inactive elsewhere (RLS
    // WITH CHECK then rejects the insert), or the access token needs a
    // refresh. Log and let the next tick retry — the visible toggle, not
    // this write, is what the user is relying on.
    console.warn(
      `[live-sharing] INSERT FAILED after ${Date.now() - insertStartedAt}ms — ` +
        `code=${error.code ?? '?'} message=${error.message} ` +
        `details=${error.details ?? '-'} hint=${error.hint ?? '-'}`
    );
    return;
  }

  console.log(
    `[live-sharing] INSERT OK id=${data?.id ?? '?'} in ${Date.now() - insertStartedAt}ms`
  );
}

// Resolve the session to write to at delivery time, from AsyncStorage —
// never from a value captured when the watcher was created. A watcher can
// outlive the session it was started for (rapid toggle off/on, mode
// handover), and writing a fix against a stale, now-inactive session id is
// exactly what produced the RLS-violation log noise. If sharing has been
// stopped, getStoredSessionId() is null and the fix is simply dropped.
async function writeCurrentSessionPoint(location: Location.LocationObject): Promise<void> {
  const sessionId = await getStoredSessionId();
  if (!sessionId) {
    console.warn('[live-sharing] location fix with no active stored session — dropping');
    return;
  }
  await writeLocationPoint(sessionId, location);
}

// One-shot fresh fix at session start so a point lands on the guardian's
// map right away, rather than after the continuous watcher's first
// callback (which can be a stale cached fix, or many seconds out on a cold
// GPS). Best effort and time-boxed — the ongoing watcher/task is what the
// session actually depends on, so a failure here is only logged.
async function captureInitialFix(sessionId: string): Promise<void> {
  try {
    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: LIVE_SHARING_ACCURACY }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), INITIAL_FIX_TIMEOUT_MS)),
    ]);
    if (!location) {
      console.warn('[live-sharing] initial fix timed out — watcher will deliver the first point');
      return;
    }
    // Guard against a toggle-off landing between start and this fix
    // resolving: only write if this is still the active stored session.
    if ((await getStoredSessionId()) !== sessionId) return;
    await writeLocationPoint(sessionId, location);
  } catch (err) {
    console.warn('[live-sharing] initial fix failed (watcher will catch up):', err);
  }
}

// --- The background task. Defined at module scope (an expo-task-manager
// hard requirement — the OS may call this before any screen mounts). This
// module is imported first thing from the custom entry point
// mobile/index.js, so defineTask runs on every JS launch, headless
// included. ---
console.log(`[live-sharing] module loaded — registering task ${LIVE_SHARING_TASK}`);

TaskManager.defineTask(LIVE_SHARING_TASK, async ({ data, error }) => {
  console.log(
    `[live-sharing] TASK FIRED error=${error ? error.message : 'none'} ` +
      `locations=${(data as { locations?: unknown[] } | null)?.locations?.length ?? 0}`
  );

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
    console.warn('[live-sharing] TASK: no stored session id — nothing to write to');
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
  const tokenTtlS = session.expires_at ? session.expires_at - Math.round(Date.now() / 1000) : null;
  console.log(`[live-sharing] TASK: auth session present (token ttl ${tokenTtlS ?? '?'}s)`);

  // Only the most recent fix matters — guardians see current position, not
  // a trail, and the 2h cleanup job would purge a dense trail anyway.
  await writeLocationPoint(sessionId, locations[locations.length - 1]);
});

async function stopForegroundWatch(): Promise<void> {
  // Invalidate any startForegroundWatch still in flight (see the generation
  // counter's comment) as well as the one we currently hold.
  foregroundWatchGeneration += 1;
  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }
}

async function startForegroundWatch(): Promise<void> {
  await stopForegroundWatch();
  const generation = foregroundWatchGeneration;
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: LIVE_SHARING_ACCURACY,
      timeInterval: PING_INTERVAL_MS,
      // Time-based only — see PING_INTERVAL_MS. 0 disables the distance filter.
      distanceInterval: 0,
    },
    (location) => {
      void writeCurrentSessionPoint(location);
    }
  );

  if (generation !== foregroundWatchGeneration) {
    // stopForegroundWatch (or another start) ran while watchPositionAsync
    // was resolving. This subscription is already orphaned — drop it
    // instead of installing it, so it can never fire.
    subscription.remove();
    console.log('[live-sharing] foreground watcher discarded (superseded before it resolved)');
    return;
  }
  foregroundSubscription = subscription;
  console.log('[live-sharing] foreground watcher subscribed');
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
  console.log(`[live-sharing] startTracking mode=${mode} session=${sessionId}`);
  if (mode === 'background') {
    await stopForegroundWatch();
    await stopBackgroundTask();
    await Location.startLocationUpdatesAsync(LIVE_SHARING_TASK, {
      accuracy: LIVE_SHARING_ACCURACY,
      timeInterval: PING_INTERVAL_MS,
      // Time-based only — see PING_INTERVAL_MS. 0 disables the distance filter.
      distanceInterval: 0,
      // Android: allow the OS to batch background deliveries to cut wake-ups.
      deferredUpdatesInterval: DEFERRED_UPDATE_MS,
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
    const started = await Location.hasStartedLocationUpdatesAsync(LIVE_SHARING_TASK);
    console.log(
      `[live-sharing] startLocationUpdatesAsync resolved — hasStarted=${started} ` +
        `interval=${PING_INTERVAL_MS}ms deferred=${DEFERRED_UPDATE_MS}ms distance=0`
    );
  } else {
    await stopBackgroundTask();
    await startForegroundWatch();
  }
  trackingStartedThisProcess = true;

  // Put a point on the guardian's map now, not after the first watcher tick.
  void captureInitialFix(sessionId);
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

  // Clear the stored id BEFORE tearing the watchers down: a location fix
  // that fires during the awaits below then resolves to "no session" and
  // is dropped in writeCurrentSessionPoint, rather than racing an insert
  // against the row we just made inactive (RLS rejects it, but that's the
  // log noise we're removing).
  await setStoredSessionId(null);

  // DB is now inactive (or there was no session at all) — safe to stop the
  // device.
  await stopForegroundWatch();
  await stopBackgroundTask();
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
