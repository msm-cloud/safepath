import type { RealtimeChannel } from '@supabase/supabase-js';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { listMyGuardianRequests, type OpenRequest } from '@/lib/guardian-requests';
import { msUntilEarliest } from '@/lib/invite-code';
import { supabase } from '@/lib/supabase';

const EXPIRY_REFRESH_MARGIN_MS = 2000;

export type MyGuardianRequestsState = {
  requests: OpenRequest[];
  refresh: () => Promise<void>;
};

// Requests the signed-in student claimed and hasn't decided on yet, for
// the Guardians tab cards. The student can read the rows they claimed, so
// a guardian cancelling (or the expiry job) reaches the tab over Realtime;
// a local timer also drops a card the moment its request expires.
export function useMyGuardianRequests(): MyGuardianRequestsState {
  const { session } = useAuth();
  const userId = session?.user.id;
  const accessToken = session?.access_token;
  const [requests, setRequests] = useState<OpenRequest[]>([]);

  const refresh = useCallback(async () => {
    const list = await listMyGuardianRequests();
    // Keep the last good list when offline; the next refresh corrects it.
    if (list) setRequests(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    (async () => {
      if (accessToken) await supabase.realtime.setAuth(accessToken);
      if (cancelled) return;

      // Per-mount topic, same reason as the active alerts channel in
      // app/(guardian)/index.tsx.
      const topic = `mobile-guardian-requests-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      channel = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'guardian_requests',
            filter: `claimed_by=eq.${userId}`,
          },
          () => void refresh()
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') return;
          console.error(
            `[MyGuardianRequests] Realtime subscription (${topic}) status: ${status}`,
            err
          );
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, accessToken, refresh]);

  useEffect(() => {
    const delay = msUntilEarliest(requests.map((request) => request.expiresAt));
    if (delay === null) return;
    const timer = setTimeout(() => void refresh(), delay + EXPIRY_REFRESH_MARGIN_MS);
    return () => clearTimeout(timer);
  }, [requests, refresh]);

  return { requests, refresh };
}
