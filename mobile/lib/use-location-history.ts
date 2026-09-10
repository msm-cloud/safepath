import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useLanguage } from '@/lib/language-context';
import { getLiveSharingPermission, requestLiveSharingPermissions } from '@/lib/location';
import { isLiveSharingActive } from '@/lib/live-sharing';
import {
  isLocationHistoryActive,
  setLocationHistoryEnabledFlag,
  startLocationHistory,
  stopLocationHistory,
} from '@/lib/location-history';
import { useUserSettings } from '@/lib/user-settings-context';

export type LocationHistoryError = 'permission-denied' | 'start-failed' | 'stop-failed';

export type UseLocationHistory = {
  // The initial settings read is still in flight — render the toggle
  // disabled rather than guessing.
  loading: boolean;
  // profiles.location_history_enabled — the source of truth, so the toggle
  // survives an app kill/reopen and reflects a change from another device.
  enabled: boolean;
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
export function useLocationHistory(): UseLocationHistory {
  const { loaded, locationHistoryEnabled, setLocationHistoryEnabled } = useUserSettings();
  const { t } = useLanguage();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LocationHistoryError | null>(null);

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
          return;
        }

        // Enabled per the DB. If "Allow all the time" was revoked in
        // system settings, turn the toggle back off so a guardian isn't
        // shown "recording on" with nothing behind it.
        const permission = await getLiveSharingPermission();
        if (cancelled) return;
        if (permission !== 'granted') {
          await stopLocationHistory();
          setLocationHistoryEnabled(false);
          await setLocationHistoryEnabledFlag(false);
          return;
        }

        // Live sharing already holds a foreground service and feeds
        // history through the piggyback path — keep our own task stopped.
        if (await isLiveSharingActive()) {
          await stopLocationHistory();
          return;
        }

        if (!(await isLocationHistoryActive())) {
          try {
            await startLocationHistory(foregroundServiceText);
          } catch {
            await stopLocationHistory();
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

    // Background ("Allow all the time") is required — a 5-minute snapshot
    // that only runs while the app is open isn't a meaningful history, so
    // (unlike live sharing) there's no foreground-only fallback.
    const permission = await requestLiveSharingPermissions();
    if (permission !== 'granted') {
      setError('permission-denied');
      setBusy(false);
      return;
    }

    setLocationHistoryEnabled(true);
    await setLocationHistoryEnabledFlag(true);

    if (!(await isLiveSharingActive())) {
      try {
        await startLocationHistory({ notificationTitle, notificationBody });
      } catch {
        setLocationHistoryEnabled(false);
        await setLocationHistoryEnabledFlag(false);
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
      setLocationHistoryEnabled(false);
      await setLocationHistoryEnabledFlag(false);
    } catch {
      setError('stop-failed');
    }
    setBusy(false);
  }, [busy, setLocationHistoryEnabled]);

  return {
    loading: !loaded,
    enabled: locationHistoryEnabled,
    busy,
    error,
    start,
    stop,
  };
}
