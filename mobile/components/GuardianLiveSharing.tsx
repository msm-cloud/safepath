import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import Avatar from '@/components/Avatar';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';

// The guardian-side view of a linked person's consent-based live location
// sharing. Only ever renders a card while that person's session is
// active — the card is removed the instant they toggle off (Realtime
// UPDATE), so a guardian never sees a stale marker without it being
// labelled as the current position.
//
// Self-contained data lifecycle (initial fetch + its own Realtime
// channel), like the web dashboard's <ActiveAlerts />. Rendered inside the
// guardian Active Alerts screen's list header. All the Realtime lessons
// already learned in app/(guardian)/index.tsx are applied here from the
// start: a unique channel topic per mount, setAuth(access_token) before
// subscribe(), and a status callback that logs anything other than
// SUBSCRIBED.
//
// Location display is a Google Maps deep link — the same prior art as the
// SOS "view last known location" link. There is no embedded map anywhere
// in this app.

// A live session whose newest point is older than this is treated as "not
// updating" — points normally arrive every ~12s, so 3 min without one
// means the phone has almost certainly lost connectivity or been
// suspended. The card then stops implying a current position.
const STALE_AFTER_MS = 3 * 60 * 1000;

type LiveShare = {
  sessionId: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  lat: number | null;
  lng: number | null;
  recordedAt: string | null;
};

type SessionChangeRow = {
  id: string;
  user_id: string;
  is_active: boolean;
  started_at: string | null;
};

type LocationChangeRow = {
  id: string;
  session_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
};

export default function GuardianLiveSharing() {
  const { t } = useLanguage();
  // Same reason as app/(guardian)/index.tsx: the Realtime effect below has
  // an empty dep array on purpose and must not re-run on a language
  // change; this ref keeps its closures on the current t().
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [shares, setShares] = useState<LiveShare[]>([]);

  // Wall-clock time, refreshed every 30s so "Updated Xs ago" stays fresh
  // between Realtime events — captured into state rather than read during
  // render. Same pattern as the alerts screens.
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- captures wall-clock time on mount (render must stay pure) then keeps it fresh every 30s; identical pattern to (guardian)/index.tsx.
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      // RLS (live_sharing_sessions_select_own_or_accepted_guardian) already
      // narrows this to sessions this guardian is allowed to see.
      const { data: sessions } = await supabase
        .from('live_sharing_sessions')
        .select('id, user_id, started_at')
        .eq('is_active', true)
        .order('started_at', { ascending: false });

      if (cancelled) return;
      if (!sessions || sessions.length === 0) {
        setShares([]);
        return;
      }

      const userIds = [...new Set(sessions.map((s) => s.user_id))];

      const [{ data: profiles }, locationResults] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
        Promise.all(
          sessions.map((s) =>
            supabase
              .from('live_locations')
              .select('lat, lng, recorded_at')
              .eq('session_id', s.id)
              .order('recorded_at', { ascending: false })
              .limit(1)
              .maybeSingle()
              .then(({ data }) => ({ sessionId: s.id, data }))
          )
        ),
      ]);

      if (cancelled) return;

      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
      const locationBySession = new Map(locationResults.map((r) => [r.sessionId, r.data]));

      setShares(
        sessions.map((s) => {
          const profile = profileById.get(s.user_id);
          const location = locationBySession.get(s.id);
          return {
            sessionId: s.id,
            userId: s.user_id,
            fullName: profile?.full_name || tRef.current('unnamedUser'),
            avatarUrl: profile?.avatar_url ?? null,
            lat: location?.lat ?? null,
            lng: location?.lng ?? null,
            recordedAt: location?.recorded_at ?? null,
          };
        })
      );
    }

    loadInitial();

    let channel: RealtimeChannel | null = null;

    async function setupRealtimeSubscription() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;

      const topic = `mobile-guardian-live-sharing-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      channel = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'live_locations' },
          (payload) => {
            const row = payload.new as LocationChangeRow;
            setShares((prev) =>
              prev.map((s) =>
                s.sessionId === row.session_id
                  ? { ...s, lat: row.lat, lng: row.lng, recordedAt: row.recorded_at }
                  : s
              )
            );
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'live_sharing_sessions' },
          (payload) => {
            const row = payload.new as SessionChangeRow;
            if (!row.is_active) {
              // They stopped sharing — the card goes away immediately.
              setShares((prev) => prev.filter((s) => s.sessionId !== row.id));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'live_sharing_sessions' },
          async (payload) => {
            const row = payload.new as SessionChangeRow;
            if (!row.is_active) return;

            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', row.user_id)
              .single();

            if (cancelled) return;

            setShares((prev) => {
              if (prev.some((s) => s.sessionId === row.id)) return prev;
              return [
                {
                  sessionId: row.id,
                  userId: row.user_id,
                  fullName: profile?.full_name || tRef.current('unnamedUser'),
                  avatarUrl: profile?.avatar_url ?? null,
                  lat: null,
                  lng: null,
                  recordedAt: null,
                },
                ...prev,
              ];
            });
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') return;
          console.error(
            `[GuardianLiveSharing] Realtime subscription (${topic}) status: ${status}`,
            err
          );
        });
    }

    setupRealtimeSubscription();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  if (shares.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('guardianLiveLocationTitle')}</Text>
      {shares.map((share) => {
        const stale =
          share.recordedAt != null && now - new Date(share.recordedAt).getTime() > STALE_AFTER_MS;

        return (
          <View key={share.sessionId} style={[styles.card, stale && styles.cardStale]}>
            <View style={[styles.badge, stale && styles.badgeStale]}>
              <Text style={styles.badgeText}>
                {stale ? t('guardianLiveLocationStaleBadge') : t('guardianLiveLocationBadge')}
              </Text>
            </View>
            <View style={styles.nameRow}>
              <Avatar name={share.fullName} url={share.avatarUrl} size={40} />
              <View style={styles.nameText}>
                <Text style={styles.name}>{share.fullName}</Text>
                <Text style={[styles.status, stale && styles.statusStale]}>
                  {!share.recordedAt
                    ? t('guardianLiveLocationWaiting')
                    : stale
                      ? t('guardianLiveLocationStale', {
                          ago: relativeTime(share.recordedAt, now, t),
                        })
                      : t('guardianLiveLocationUpdated', {
                          ago: relativeTime(share.recordedAt, now, t),
                        })}
                </Text>
              </View>
            </View>

            {share.lat != null && share.lng != null && (
              <Pressable
                onPress={() =>
                  Linking.openURL(`https://www.google.com/maps?q=${share.lat},${share.lng}`)
                }
              >
                <Text style={styles.link}>{t('viewOnMapLink')}</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

function relativeTime(
  iso: string,
  now: number,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return t('secondsAgo', { n: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  return t('hoursAgo', { n: hours });
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    borderWidth: 2,
    borderColor: '#1a7f37',
    backgroundColor: '#e6f4ea',
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  cardStale: {
    borderColor: '#b8860b',
    backgroundColor: '#fff4e5',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a7f37',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeStale: {
    backgroundColor: '#b8860b',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameText: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  status: {
    fontSize: 13,
    color: '#3a6a47',
  },
  statusStale: {
    color: '#7a4a00',
    fontWeight: '600',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2f95dc',
  },
});
