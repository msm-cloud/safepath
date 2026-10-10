import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { listGuardianRequests, type GuardianRequestSummary } from '@/lib/guardian-requests';
import { inviteCodeExpiresAt, msUntilEarliest } from '@/lib/invite-code';
import { useGuardianLinkAdded } from '@/lib/use-guardian-link-revoked';

const EXPIRY_REFRESH_MARGIN_MS = 2000;

export type GuardianRequestsState = {
  requests: GuardianRequestSummary[];
  loading: boolean;
  loadFailed: boolean;
  refresh: () => Promise<void>;
};

// The signed-in guardian's invite codes. The guardian can't read
// guardian_requests over Realtime, and nothing they can see changes
// without one of these, so the list is re-fetched when:
//   - the screen gains focus or the app returns to the foreground
//   - a student accepts (an accepted guardian_links row is inserted)
//   - the earliest waiting code reaches its 24 hours
//   - the guardian creates or cancels a code (callers call refresh)
// A decline changes nothing the guardian sees, by design.
export function useGuardianRequests(): GuardianRequestsState {
  const [requests, setRequests] = useState<GuardianRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listGuardianRequests();
    setLoading(false);
    setLoadFailed(list === null);
    if (list) setRequests(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  useGuardianLinkAdded(() => void refresh());

  useEffect(() => {
    const delay = msUntilEarliest(
      requests
        .filter((request) => request.state === 'waiting')
        .map((request) => inviteCodeExpiresAt(request.createdAt).toISOString())
    );
    if (delay === null) return;
    // A little after the server's moment, so the refresh already sees it.
    const timer = setTimeout(() => void refresh(), delay + EXPIRY_REFRESH_MARGIN_MS);
    return () => clearTimeout(timer);
  }, [requests, refresh]);

  return { requests, loading, loadFailed, refresh };
}
