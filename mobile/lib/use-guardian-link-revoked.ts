import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type GuardianLinkChangeRow = {
  user_id: string;
  guardian_id: string | null;
  status: 'pending' | 'accepted' | 'revoked';
};

// Calls onRevoked(userId) when a student ends their link with the signed-in
// guardian, so open screens drop that student without a restart. RLS
// already stops new data from arriving; this clears what is on screen.
// Nothing is shown about who did it or why.
export function useGuardianLinkRevoked(onRevoked: (userId: string) => void): void {
  useGuardianLinkChange('UPDATE', (row) => {
    if (row.status === 'revoked') onRevoked(row.user_id);
  });
}

// Calls onAdded(userId) when a student accepts the signed-in guardian's
// invite request, which inserts an accepted link.
export function useGuardianLinkAdded(onAdded: (userId: string) => void): void {
  useGuardianLinkChange('INSERT', (row) => {
    if (row.status === 'accepted') onAdded(row.user_id);
  });
}

function useGuardianLinkChange(
  event: 'INSERT' | 'UPDATE',
  onChange: (row: GuardianLinkChangeRow) => void
): void {
  const { session } = useAuth();
  const guardianId = session?.user.id;
  const accessToken = session?.access_token;

  // Keeps the subscription stable when callers pass an inline callback.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!guardianId) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    (async () => {
      if (accessToken) await supabase.realtime.setAuth(accessToken);
      if (cancelled) return;

      // Per-mount topic, same reason as the active alerts channel in
      // app/(guardian)/index.tsx.
      const topic = `mobile-guardian-links-${event.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      channel = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          {
            event,
            schema: 'public',
            table: 'guardian_links',
            filter: `guardian_id=eq.${guardianId}`,
          },
          (payload) => onChangeRef.current(payload.new as GuardianLinkChangeRow)
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') return;
          console.error(
            `[GuardianLinkChange] Realtime subscription (${topic}) status: ${status}`,
            err
          );
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [event, guardianId, accessToken]);
}
