'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/lib/language-context';
import { createClient } from '@/lib/supabase/client';
import type { TranslationKey } from '@/lib/translations';

// Guardian-side view of a linked person's consent-based live location
// sharing. Mirrors active-alerts.tsx — same self-contained fetch +
// Realtime lifecycle, same hard-won subscription lessons (unique topic per
// effect run, setAuth(access_token) before subscribe(), status callback
// that logs anything other than SUBSCRIBED). See active-alerts.tsx for the
// full rationale on each of those.
//
// A card exists only while that person's session is active — it's removed
// the moment they toggle off (Realtime UPDATE), so a guardian never sees a
// stale marker without the "Updated …" label showing its age. Location is
// a Google Maps deep link, the same prior art as the SOS card; there is no
// embedded map in this app.

// A live session whose newest point is older than this is treated as "not
// updating" — points normally arrive every ~12s, so 3 min without one
// means the phone has almost certainly lost connectivity or been
// suspended. The card then stops implying a current position.
const STALE_AFTER_MS = 3 * 60 * 1000;

type LiveShare = {
  sessionId: string;
  userId: string;
  fullName: string;
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

export default function LiveSharing() {
  const { t } = useLanguage();
  // The Realtime effect below must not re-run on a language change (empty
  // dep array, intentional). This ref gives its closures the current t().
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [shares, setShares] = useState<LiveShare[]>([]);
  // Bumped every 30s to keep the "Updated Xs ago" label fresh between
  // Realtime events.
  const [, setTick] = useState(0);

  useEffect(() => {
    const tickId = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(tickId);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadInitial() {
      const { data: sessions } = await supabase
        .from('live_sharing_sessions')
        .select(
          'id, user_id, started_at, user:profiles!live_sharing_sessions_user_id_fkey(full_name)'
        )
        .eq('is_active', true)
        .order('started_at', { ascending: false });

      if (cancelled || !sessions) return;

      const rows = sessions as unknown as Array<{
        id: string;
        user_id: string;
        user: { full_name: string } | null;
      }>;

      if (rows.length === 0) {
        setShares([]);
        return;
      }

      const locationResults = await Promise.all(
        rows.map((row) =>
          supabase
            .from('live_locations')
            .select('lat, lng, recorded_at')
            .eq('session_id', row.id)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => ({ sessionId: row.id, data }))
        )
      );

      if (cancelled) return;

      const locationBySession = new Map(locationResults.map((r) => [r.sessionId, r.data]));

      setShares(
        rows.map((row) => {
          const location = locationBySession.get(row.id);
          return {
            sessionId: row.id,
            userId: row.user_id,
            fullName: row.user?.full_name || tRef.current('unnamedUser'),
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

      const topic = `dashboard-live-sharing-${crypto.randomUUID()}`;

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
              .select('full_name')
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
          console.error(`[LiveSharing] Realtime subscription (${topic}) status: ${status}`, err);
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
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{t('liveLocationTitle')}</h2>
      {shares.map((share) => {
        const stale = isStale(share.recordedAt);

        return (
          <div
            key={share.sessionId}
            className={`flex flex-col gap-2 rounded-lg border-2 p-5 ${
              stale ? 'border-amber-600 bg-amber-50' : 'border-green-600 bg-green-50'
            }`}
          >
            <span
              className={`w-fit rounded px-2 py-0.5 text-xs font-bold tracking-wide text-white ${
                stale ? 'bg-amber-600' : 'bg-green-700'
              }`}
            >
              {stale ? t('liveLocationStaleBadge') : t('liveLocationBadge')}
            </span>
            <p className="text-lg font-semibold text-zinc-900">{share.fullName}</p>
            <p className={`text-sm ${stale ? 'font-medium text-amber-800' : 'text-zinc-600'}`}>
              {!share.recordedAt
                ? t('liveLocationWaiting')
                : stale
                  ? t('liveLocationStale', { ago: relativeTime(share.recordedAt, t) })
                  : t('liveLocationUpdated', { ago: relativeTime(share.recordedAt, t) })}
            </p>
            {share.lat != null && share.lng != null && (
              <a
                href={`https://www.google.com/maps?q=${share.lat},${share.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-blue-700 underline"
              >
                {t('viewOnMap')}
              </a>
            )}
          </div>
        );
      })}
    </section>
  );
}

// Module-scope (not inline in render) so the react-hooks/purity rule
// doesn't flag the Date.now() call — same reason relativeTime below is a
// standalone function. Kept fresh by the 30s tick that re-renders this
// component.
function isStale(recordedAt: string | null): boolean {
  return recordedAt != null && Date.now() - new Date(recordedAt).getTime() > STALE_AFTER_MS;
}

function relativeTime(
  iso: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return t('secondsAgo', { n: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  return t('hoursAgo', { n: hours });
}
