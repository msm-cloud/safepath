import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { getLiveSharingPermission, requestLiveSharingPermissions } from '@/lib/location';
import {
  isLiveSharingActive,
  resumeLiveSharing,
  startLiveSharing,
  stopLiveSharing,
  type LiveSharingMode,
} from '@/lib/live-sharing';
import { supabase } from '@/lib/supabase';

export type LiveSharingError =
  'permission-denied' | 'already-sharing-elsewhere' | 'start-failed' | 'stop-failed';

export type UseLiveSharing = {
  // The initial DB read for the current focus is in flight — the toggle
  // should render disabled/neutral rather than guessing a state.
  loading: boolean;
  // An active live_sharing_sessions row exists for this user. This — the
  // DB, not local state or the OS task — is the source of truth, so the
  // toggle survives an app kill/reopen and reflects a stop from another
  // device.
  isSharing: boolean;
  // How the active session is actually running. 'foreground' means "Allow
  // all the time" was refused: sharing works only while the app is open,
  // and the UI is expected to show a visible warning.
  mode: LiveSharingMode | null;
  // A start/stop is in flight.
  busy: boolean;
  error: LiveSharingError | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

// Drives the Home-screen "Share Live Location" toggle. Reconciles three
// things every time Home gains focus: the DB session row (source of
// truth), the OS location task, and the current permission grant.
export function useLiveSharing(): UseLiveSharing {
  const { session } = useAuth();
  const { t } = useLanguage();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [mode, setMode] = useState<LiveSharingMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LiveSharingError | null>(null);

  const notificationTitle = t('liveSharingNotificationTitle');
  const notificationBody = t('liveSharingNotificationBody');

  const clearLocalState = useCallback(() => {
    setIsSharing(false);
    setMode(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      const foregroundServiceText = { notificationTitle, notificationBody };

      (async () => {
        setLoading(true);

        const { data } = await supabase
          .from('live_sharing_sessions')
          .select('id, started_at')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;

        const trackingActive = await isLiveSharingActive();
        if (cancelled) return;

        if (!data) {
          // DB says not sharing. Tear down tracking that somehow outlived
          // its session (e.g. stopped from another device).
          if (trackingActive) await stopLiveSharing(null);
          if (cancelled) return;
          clearLocalState();
          setLoading(false);
          return;
        }

        // DB says sharing — make sure the device is actually reporting.
        const permission = await getLiveSharingPermission();
        if (cancelled) return;

        if (permission === 'denied') {
          // Permission was revoked in system settings while sharing was
          // on. Close the session so guardians aren't shown a live
          // session with nothing behind it.
          await stopLiveSharing(data.id);
          if (cancelled) return;
          clearLocalState();
          setLoading(false);
          return;
        }

        const resolvedMode: LiveSharingMode =
          permission === 'granted' ? 'background' : 'foreground';

        if (!trackingActive) {
          try {
            await resumeLiveSharing({
              sessionId: data.id,
              mode: resolvedMode,
              foregroundServiceText,
            });
          } catch {
            await stopLiveSharing(data.id);
            if (cancelled) return;
            clearLocalState();
            setLoading(false);
            return;
          }
        }
        if (cancelled) return;

        setIsSharing(true);
        setMode(resolvedMode);
        setLoading(false);
      })();

      return () => {
        cancelled = true;
      };
    }, [userId, notificationTitle, notificationBody, clearLocalState])
  );

  const start = useCallback(async () => {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);

    const permission = await requestLiveSharingPermissions();
    if (permission === 'denied') {
      setError('permission-denied');
      setBusy(false);
      return;
    }

    const resolvedMode: LiveSharingMode = permission === 'granted' ? 'background' : 'foreground';
    const result = await startLiveSharing({
      userId,
      mode: resolvedMode,
      foregroundServiceText: { notificationTitle, notificationBody },
    });

    if (result.ok) {
      setIsSharing(true);
      setMode(resolvedMode);
    } else if (result.reason === 'already-active-elsewhere') {
      setError('already-sharing-elsewhere');
    } else {
      setError('start-failed');
    }
    setBusy(false);
  }, [userId, busy, notificationTitle, notificationBody]);

  const stop = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    // stopLiveSharing flips the DB row inactive BEFORE it stops the device
    // and only reports ok on success. On failure the session is still
    // genuinely active, so keep showing "on" and surface stop-failed — do
    // NOT clear local state, or the reconcile path would later resume
    // tracking the user just tried to stop.
    let result: { ok: boolean };
    try {
      result = await stopLiveSharing();
    } catch {
      result = { ok: false };
    }

    if (result.ok) {
      clearLocalState();
    } else {
      setError('stop-failed');
    }
    setBusy(false);
  }, [busy, clearLocalState]);

  return { loading, isSharing, mode, busy, error, start, stop };
}
