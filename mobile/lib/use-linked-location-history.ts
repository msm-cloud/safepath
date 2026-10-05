import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';

// Data behind the two recorded-location screens:
//   - 'guardian': a guardian reading the trail of each student they support
//     (app/(guardian)/location-history.tsx)
//   - 'user': a student reading the trail of each guardian who shares their
//     own location (app/(tabs)/guardian-location.tsx)
// Both read the same tables with the guardian_links roles swapped. Which
// trail points come back, and for how long, is decided by the
// location_history_points SELECT policies and the per-link retention, so
// the trail query needs no time filter of its own.
//
// Fetch on focus plus pull-to-refresh, not Realtime: a 5-minute breadcrumb
// trail has no real-time value, but the list still has to pick up the other
// side turning recording on or off while the tab sits in the background.

export type HistoryViewer = 'guardian' | 'user';

export type LinkedPerson = {
  linkId: string;
  personId: string;
  fullName: string;
  avatarUrl: string | null;
  recording: boolean;
};

export type TrailPoint = { id: string; lat: number; lng: number; recorded_at: string };

const TRAIL_LIMIT = 200;

type ProfileJoin = {
  full_name: string;
  avatar_url: string | null;
  location_history_enabled: boolean;
} | null;

export function useLinkedLocationHistory(viewer: HistoryViewer) {
  const { session } = useAuth();
  const { t } = useLanguage();
  const myId = session?.user.id;

  const [people, setPeople] = useState<LinkedPerson[]>([]);
  const [retentionByPerson, setRetentionByPerson] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One trail open at a time.
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);
  // Drops a slow response for a trail that has since been closed or swapped.
  const trailRequest = useRef<string | null>(null);

  const loadTrail = useCallback(async (personId: string) => {
    trailRequest.current = personId;
    setTrailLoading(true);
    const { data } = await supabase
      .from('location_history_points')
      .select('id, lat, lng, recorded_at')
      .eq('user_id', personId)
      .order('recorded_at', { ascending: false })
      .limit(TRAIL_LIMIT);
    if (trailRequest.current !== personId) return;
    setTrail((data ?? []) as TrailPoint[]);
    setTrailLoading(false);
  }, []);

  const fetchPeople = useCallback(async () => {
    if (!myId) return;

    const linked =
      viewer === 'guardian'
        ? await supabase
            .from('guardian_links')
            .select(
              'id, person_id:user_id, person:profiles!guardian_links_user_id_fkey(full_name, avatar_url, location_history_enabled)'
            )
            .eq('guardian_id', myId)
            .eq('status', 'accepted')
            .order('accepted_at', { ascending: false })
        : await supabase
            .from('guardian_links')
            .select(
              'id, person_id:guardian_id, person:profiles!guardian_links_guardian_id_fkey(full_name, avatar_url, location_history_enabled)'
            )
            .eq('user_id', myId)
            .eq('status', 'accepted')
            .order('accepted_at', { ascending: false });

    if (linked.error) {
      setError(linked.error.message);
      return;
    }
    setError(null);

    const rows = linked.data as unknown as {
      id: string;
      person_id: string | null;
      person: ProfileJoin;
    }[];
    setPeople(
      rows
        .filter((r): r is typeof r & { person_id: string } => r.person_id !== null)
        .map((r) => ({
          linkId: r.id,
          personId: r.person_id,
          fullName: r.person?.full_name || t('unnamedUser'),
          avatarUrl: r.person?.avatar_url ?? null,
          recording: r.person?.location_history_enabled ?? false,
        }))
    );

    // recorded_by_role names whose trail the retention applies to: the
    // student's ('user') when a guardian is viewing, and the other way round.
    const { data: retention } =
      viewer === 'guardian'
        ? await supabase
            .from('location_history_retention')
            .select('person_id:user_id, retention_hours')
            .eq('guardian_id', myId)
            .eq('recorded_by_role', 'user')
        : await supabase
            .from('location_history_retention')
            .select('person_id:guardian_id, retention_hours')
            .eq('user_id', myId)
            .eq('recorded_by_role', 'guardian');
    setRetentionByPerson(
      Object.fromEntries(
        ((retention ?? []) as { person_id: string; retention_hours: number }[]).map((r) => [
          r.person_id,
          r.retention_hours,
        ])
      )
    );
  }, [myId, viewer, t]);

  // The tab stays mounted once visited, so this refetches on every focus
  // rather than once on mount.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchPeople().finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [fetchPeople])
  );

  const closeTrail = useCallback(() => {
    trailRequest.current = null;
    setOpenPersonId(null);
    setTrail([]);
    setTrailLoading(false);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await fetchPeople();
    if (openPersonId) await loadTrail(openPersonId);
    setRefreshing(false);
  };

  const setRetention = async (personId: string, hours: number) => {
    if (!myId) return;
    // Optimistic, same fire-and-forget pattern as the settings toggles.
    setRetentionByPerson((prev) => ({ ...prev, [personId]: hours }));
    await supabase.from('location_history_retention').upsert(
      viewer === 'guardian'
        ? {
            user_id: personId,
            guardian_id: myId,
            recorded_by_role: 'user',
            retention_hours: hours,
          }
        : {
            user_id: myId,
            guardian_id: personId,
            recorded_by_role: 'guardian',
            retention_hours: hours,
          },
      { onConflict: 'user_id,guardian_id,recorded_by_role' }
    );
    if (openPersonId === personId) await loadTrail(personId);
  };

  const toggleTrail = (personId: string) => {
    if (openPersonId === personId) {
      closeTrail();
      return;
    }
    setOpenPersonId(personId);
    setTrail([]);
    void loadTrail(personId);
  };

  // For a link ended elsewhere: RLS already stops new data, this clears
  // what is on screen.
  const removePerson = useCallback(
    (personId: string) => {
      setPeople((prev) => prev.filter((p) => p.personId !== personId));
      if (openPersonId === personId) closeTrail();
    },
    [openPersonId, closeTrail]
  );

  return {
    people,
    retentionByPerson,
    loading,
    refreshing,
    error,
    openPersonId,
    trail,
    trailLoading,
    refresh,
    setRetention,
    toggleTrail,
    removePerson,
  };
}

export type LinkedLocationHistory = ReturnType<typeof useLinkedLocationHistory>;
