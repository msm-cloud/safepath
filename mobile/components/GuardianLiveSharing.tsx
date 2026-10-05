import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import IconTile from '@/components/ui/IconTile';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import { useGuardianLinkRevoked } from '@/lib/use-guardian-link-revoked';
import type { TranslationKey } from '@/lib/translations';
import { useTheme } from '@/theme';

// The guardian-side view of a linked person's consent-based live location
// sharing. A person's card only shows while their session is active — it
// is removed the instant they toggle off (Realtime UPDATE), so a guardian
// never sees a stale marker without it being labelled as the current
// position. With nobody sharing, the section says so rather than
// disappearing.
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

const LIVE_ICON = { ios: 'location.fill', android: 'location_on', web: 'location_on' } as const;
const RETRY_ICON = {
  ios: 'arrow.clockwise',
  android: 'refresh',
  web: 'refresh',
} as const;
const NOT_SHARING_ICON = {
  ios: 'location.slash',
  android: 'location_off',
  web: 'location_off',
} as const;

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
  const { colors, radius, spacing } = useTheme();
  // Same reason as app/(guardian)/index.tsx: the Realtime effect below has
  // an empty dep array on purpose and must not re-run on a language
  // change; this ref keeps its closures on the current t().
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [shares, setShares] = useState<LiveShare[]>([]);
  // The empty state only shows once a fetch has actually succeeded, so it
  // never flashes before a running share loads and never stands in for a
  // failed request. Bumping loadAttempt re-runs the fetch.
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  useGuardianLinkRevoked((userId) =>
    setShares((prev) => prev.filter((share) => share.userId !== userId))
  );

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
      if (!sessions) {
        setLoadStatus('error');
        return;
      }
      if (sessions.length === 0) {
        setShares([]);
        setLoadStatus('loaded');
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
      setLoadStatus('loaded');
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  useEffect(() => {
    let cancelled = false;
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

  if (loadStatus === 'loading' && shares.length === 0) return null;

  const retry = () => {
    setLoadStatus('loading');
    setLoadAttempt((n) => n + 1);
  };

  return (
    <View style={{ gap: spacing.sm + 2 }}>
      <Text variant="title">{t('guardianLiveLocationTitle')}</Text>
      {loadStatus === 'error' && shares.length === 0 && (
        <Card
          onPress={retry}
          accessibilityLabel={t('guardianLiveLocationLoadError')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <IconTile icon={RETRY_ICON} tone="warning" size={40} />
          <Text variant="bodySm" color="textSecondary" style={{ flex: 1 }}>
            {t('guardianLiveLocationLoadError')}
          </Text>
        </Card>
      )}
      {loadStatus === 'loaded' && shares.length === 0 && (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconTile icon={NOT_SHARING_ICON} size={40} />
          <Text variant="bodySm" color="textSecondary" style={{ flex: 1 }}>
            {t('guardianLiveLocationEmpty')}
          </Text>
        </Card>
      )}
      {shares.map((share) => {
        const stale =
          share.recordedAt != null && now - new Date(share.recordedAt).getTime() > STALE_AFTER_MS;

        return (
          <Card key={share.sessionId} style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={share.fullName} url={share.avatarUrl} size={40} />
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text variant="body" weight="semibold">
                  {share.fullName}
                </Text>
                <Text variant="caption" color={stale ? 'dangerText' : 'textMuted'}>
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
              <View
                style={{
                  paddingVertical: spacing.xxs,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.pill,
                  backgroundColor: stale ? colors.warningSoft : colors.successSoft,
                }}
              >
                <Text variant="micro" color={stale ? 'onWarningSoft' : 'onSuccessSoft'}>
                  {stale ? t('guardianLiveLocationStaleBadge') : t('guardianLiveLocationBadge')}
                </Text>
              </View>
            </View>

            {share.lat != null && share.lng != null && (
              <Pressable
                onPress={() =>
                  Linking.openURL(`https://www.google.com/maps?q=${share.lat},${share.lng}`)
                }
                accessibilityRole="link"
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <IconTile icon={LIVE_ICON} tone="primarySoft" size={32} />
                <Text variant="label" color="primary">
                  {t('viewOnMapLink')}
                </Text>
              </Pressable>
            )}
          </Card>
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
