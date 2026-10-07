import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

// Foregrounding the app often happens many times a minute (switching to
// the dialer, the camera); one check per window is plenty.
const MIN_CHECK_INTERVAL_MS = 15 * 60_000;

export type OtaUpdateState = {
  // A newer update has been downloaded and will run after a reload.
  isUpdateReady: boolean;
  restartNow: () => Promise<void>;
};

// Checks for an update on launch and whenever the app returns to the
// foreground, and downloads it in the background. Applying it is left to
// the caller (restartNow) or to the next cold start. Inert in development
// and Expo Go, where expo-updates is disabled.
export function useOtaUpdate(): OtaUpdateState {
  const { isUpdatePending, isChecking, isDownloading } = Updates.useUpdates();
  const busyRef = useRef(false);
  const lastCheckRef = useRef(0);

  // Mirrored into a ref so the AppState listener below doesn't resubscribe
  // on every change.
  useEffect(() => {
    busyRef.current = isChecking || isDownloading || isUpdatePending;
  }, [isChecking, isDownloading, isUpdatePending]);

  useEffect(() => {
    if (!Updates.isEnabled) return;

    const checkAndFetch = async () => {
      const now = Date.now();
      if (busyRef.current || now - lastCheckRef.current < MIN_CHECK_INTERVAL_MS) return;
      lastCheckRef.current = now;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // No network, or the launch-time check is still running. The next
        // foreground or cold start tries again.
      }
    };

    void checkAndFetch();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkAndFetch();
    });
    return () => subscription.remove();
  }, []);

  return {
    isUpdateReady: Updates.isEnabled && isUpdatePending,
    restartNow: () => Updates.reloadAsync(),
  };
}
