import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type AcceptedGuardian = {
  linkId: string;
  fullName: string | null;
  avatarUrl: string | null;
};

// The signed-in user's accepted guardians, for the Home header summary.
// Refetched on every focus so a guardian added or removed on the
// Guardians tab shows up when the person comes back. `loaded` stays false
// until the first fetch succeeds, so the header never claims "no
// guardians" because of a failed request.
export function useAcceptedGuardians(userId: string | undefined) {
  const [guardians, setGuardians] = useState<AcceptedGuardian[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;

      supabase
        .from('guardian_links')
        .select('id, guardian:profiles!guardian_links_guardian_id_fkey(full_name, avatar_url)')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (cancelled || error || !data) return;
          const rows = data as unknown as {
            id: string;
            guardian: { full_name: string | null; avatar_url: string | null } | null;
          }[];
          setGuardians(
            rows.map((row) => ({
              linkId: row.id,
              fullName: row.guardian?.full_name ?? null,
              avatarUrl: row.guardian?.avatar_url ?? null,
            }))
          );
          setLoaded(true);
        });

      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  return { guardians, loaded };
}
