import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useLanguage } from '@/lib/language-context';
import { getLiveSharingPermission, requestLiveSharingPermissions } from '@/lib/location';
import { isLiveSharingActive } from '@/lib/live-sharing';
import {
  isLocationHistoryActive,
  type LocationHistoryMode,
  setLocationHistoryEnabledFlag,
  startLocationHistory,
  stopLocationHistory,
} from '@/lib/location-history';
import { useUserSettings } from '@/lib/user-settings-context';

export type LocationHistoryError =
  'permission-denied' | 'start-failed' | 'stop-failed' | 'save-failed';

export type UseLocationHistory = {
  // The initial settings read is still in flight — render the toggle
  // disabled rather than guessing.
  loading: boolean;
  // profiles.location_history_enabled — the source of truth, so the toggle
  // survives an app kill/reopen and reflects a change from another device.
  enabled: boolean;
  // How recording is actually running while `enabled`:
  //   'background'  — "Allow all the time": snapshots keep coming while the
  //                   app is closed or the phone is locked.
  //   'foreground'  — only "While using the app": snapshots are taken only
  //                   while SafePath is open; the Home card shows a warning.
  //   null          — not recording (disabled, still loading, or live
  //                   sharing is carrying history via its own service).
  mode: LocationHistoryMode | null;
  // A start/stop is in flight.
  busy: boolean;
  error: LocationHistoryError | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

// Drives the Home-screen "Location History Recording" toggle. Reconciles
// the DB flag (source of truth), the OS task, the permission grant, and
// whether live sharing is currently holding the foreground service (in
// which case history rides along via live-sharing.ts's piggyback call and
// this hook keeps the standalone task stopped — only one notification).
//
// Permission handling mirrors use-live-sharing.ts: foreground location is
// the floor, and only a hard 'denied' turns the feature back off. A
// missing background grant ("Allow all the time" refused or later revoked
// by Android — routine on Android 11+) drops recording to foreground mode
// with a visible warning, it does NOT silently flip
// profiles.location_history_enabled to false.
export function useLocationHistory(): UseLocationHistory {
  const { loaded, locationHistoryEnabled, setLocationHistoryEnabled } = useUserSettings();
  const { t } = useLanguage();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LocationHistoryError | null>(null);
  const [mode, setMode] = useState<LocationHistoryMode | null>(null);

  const notificationTitle = t('locationHistoryNotificationTitle');
  const notificationBody = t('locationHistoryNotificationBody');

  useFocusEffect(
    useCallback(() => {
      if (!loaded) return;
      let cancelled = false;
      const foregroundServiceText = { notificationTitle, notificationBody };

      (async () => {
        // Keep the headless-path flag in sync with the DB truth first.
        await setLocationHistoryEnabledFlag(locationHistoryEnabled);

        if (!locationHistoryEnabled) {
          await stopLocationHistory();
          if (!cancelled) setMode(null);
          return;
        }

        // Enabled per the DB. Foreground location is the floor — without it
        // nothing can record, so only a hard 'denied' turns the toggle back
        // off, and it surfaces the denied banner so the student sees why
        // rather than the flag flipping with no signal. 'foreground-only'
        // is NOT a failure here.
        const permission = await getLiveSharingPermission();
        if (cancelled) return;

        if (permission === 'denied') {
          await stopLocationHistory();
          const persisted = await setLocationHistoryEnabled(false);
          await setLocationHistoryEnabledFlag(false);
          if (!cancelled) {
            setMode(null);
            setError(persisted ? 'permission-denied' : 'save-failed');
          }
          return;
        }

        // 'granted' -> keep recording while locked; 'foreground-only' ->
        // record only while the app is open, with a warning. Either way the
        // feature stays on.
        const resolvedMode: LocationHistoryMode =
          permission === 'granted' ? 'background' : 'foreground';
        if (!cancelled) {
          setMode(resolvedMode);
          // Clear a stale denied banner once permission is back.
          setError((current) => (current === 'permission-denied' ? null : current));
        }

        // Live sharing already holds a foreground service and feeds history
        // through the piggyback path — keep our own task stopped.
        if (await isLiveSharingActive()) {
          await stopLocationHistory();
          return;
        }

        if (!(await isLocationHistoryActive(resolvedMode))) {
          try {
            await startLocationHistory(resolvedMode, foregroundServiceText);
          } catch {
            await stopLocationHistory();
            if (!cancelled) setMode(null);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [
      loaded,
      locationHistoryEnabled,
      setLocationHistoryEnabled,
      notificationTitle,
      notificationBody,
    ])
  );

  const start = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);

    // Foreground permission is the floor. Background ("Allow all the time")
    // upgrades recording to keep running while the app is closed or locked;
    // without it we still record while the app is open (foreground mode)
    // and show a warning — the same tradeoff live sharing makes, rather
    // than refusing to turn the feature on at all.
    const permission = await requestLiveSharingPermissions();
    if (permission === 'denied') {
      setError('permission-denied');
      setBusy(false);
      return;
    }

    const resolvedMode: LocationHistoryMode =
      permission === 'granted' ? 'background' : 'foreground';

    // Await the DB write and only commit if it actually persisted — a
    // fire-and-forget write that fails would leave the toggle showing ON
    // while the server (and every guardian) still sees OFF.
    const persisted = await setLocationHistoryEnabled(true);
    if (!persisted) {
      await setLocationHistoryEnabledFlag(false);
      setError('save-failed');
      setBusy(false);
      return;
    }
    await setLocationHistoryEnabledFlag(true);
    setMode(resolvedMode);

    if (!(await isLiveSharingActive())) {
      try {
        await startLocationHistory(resolvedMode, { notificationTitle, notificationBody });
      } catch {
        await setLocationHistoryEnabled(false);
        await setLocationHistoryEnabledFlag(false);
        setMode(null);
        setError('start-failed');
      }
    }
    setBusy(false);
  }, [busy, setLocationHistoryEnabled, notificationTitle, notificationBody]);

  const stop = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await stopLocationHistory();
      const persisted = await setLocationHistoryEnabled(false);
      // Keep the headless flag matching what actually persisted: if the
      // write failed the feature is still enabled server-side and the next
      // focus reconcile will resume tracking.
      await setLocationHistoryEnabledFlag(!persisted);
      if (persisted) {
        setMode(null);
      } else {
        setError('save-failed');
      }
    } catch {
      setError('stop-failed');
    }
    setBusy(false);
  }, [busy, setLocationHistoryEnabled]);

  return {
    loading: !loaded,
    enabled: locationHistoryEnabled,
    mode,
    busy,
    error,
    start,
    stop,
  };
}
