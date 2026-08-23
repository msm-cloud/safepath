'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

type ActiveAlert = {
  id: string;
  user_id: string;
  full_name: string;
  created_at: string;
  last_lat: number | null;
  last_lng: number | null;
};

type AlertsChangeRow = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  last_lat: number | null;
  last_lng: number | null;
};

// Subscribes to Realtime changes on `alerts` (INSERT + UPDATE) for
// whichever rows RLS lets this guardian see — i.e. only their linked
// users' alerts, the same scope a direct SELECT already has (see
// supabase/migrations/20260823145243_enable_realtime_on_alerts.sql). No
// client-side filtering by guardian_links needed; the server already only
// delivers what this connection is allowed to see.
export default function ActiveAlerts() {
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  // Bumped every 30s purely to force a re-render so "how long ago" stays
  // fresh even when no new realtime event has arrived.
  const [, setTick] = useState(0);

  useEffect(() => {
    const tickId = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(tickId);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadInitial() {
      const { data } = await supabase
        .from('alerts')
        .select(
          'id, user_id, created_at, last_lat, last_lng, user:profiles!alerts_user_id_fkey(full_name)'
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (cancelled || !data) return;

      const rows = data as unknown as Array<{
        id: string;
        user_id: string;
        created_at: string;
        last_lat: number | null;
        last_lng: number | null;
        user: { full_name: string } | null;
      }>;

      setAlerts(
        rows.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          created_at: row.created_at,
          last_lat: row.last_lat,
          last_lng: row.last_lng,
          full_name: row.user?.full_name || 'Unnamed user',
        }))
      );
    }

    loadInitial();

    // A fresh, unique topic per effect invocation — not a static string.
    // React 18 StrictMode double-invokes effects on mount (mount ->
    // cleanup -> mount) to catch exactly this kind of bug:
    // RealtimeClient.channel() dedupes by exact topic string, and
    // removeChannel() is async (it awaits a real unsubscribe round-trip
    // before actually removing the channel from the client's internal
    // list). With a static topic, the second (persisting) mount's
    // channel() call could still find the FIRST mount's channel - mid-
    // teardown from the cleanup that already ran - still registered under
    // the same name, and get handed that stale instance back instead of a
    // new one. subscribe() on a channel that isn't isClosed() is a silent
    // no-op: no error, just no phx_join ever sent. A unique topic per
    // invocation makes that collision structurally impossible, regardless
    // of timing.
    const topic = `dashboard-active-alerts-${crypto.randomUUID()}`;

    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        async (payload) => {
          const row = payload.new as AlertsChangeRow;
          if (row.status !== 'active') return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', row.user_id)
            .single();

          if (cancelled) return;

          setAlerts((prev) => {
            if (prev.some((a) => a.id === row.id)) return prev;
            return [
              {
                id: row.id,
                user_id: row.user_id,
                created_at: row.created_at,
                last_lat: row.last_lat,
                last_lng: row.last_lng,
                full_name: profile?.full_name || 'Unnamed user',
              },
              ...prev,
            ];
          });
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' }, (payload) => {
        const row = payload.new as AlertsChangeRow;

        setAlerts((prev) => {
          if (row.status !== 'active') {
            // Resolved (by the user themself or another guardian) — the
            // card disappears.
            return prev.filter((a) => a.id !== row.id);
          }
          return prev.map((a) =>
            a.id === row.id ? { ...a, last_lat: row.last_lat, last_lng: row.last_lng } : a
          );
        });
      })
      .subscribe((status, err) => {
        // The original bug produced no error at all — the join was just
        // silently never sent. Logging every non-SUBSCRIBED status (not
        // just err) means a failed/stuck join is now always visible in the
        // console instead of only showing up as "no alerts ever appear".
        if (status === 'SUBSCRIBED') return;
        console.error(`[ActiveAlerts] Realtime subscription (${topic}) status: ${status}`, err);
      });

    return () => {
      cancelled = true;
      // `channel` is this specific effect invocation's own instance
      // (captured by closure, and now registered under its own unique
      // topic) — this always tears down exactly the channel this run
      // created, never a different run's.
      supabase.removeChannel(channel);
    };
  }, []);

  const handleResolve = async (alertId: string) => {
    setResolvingId(alertId);
    const supabase = createClient();
    const { error } = await supabase
      .from('alerts')
      .update({ status: 'resolved' })
      .eq('id', alertId);
    setResolvingId(null);

    if (!error) {
      // Remove immediately rather than waiting on the realtime UPDATE event
      // to round-trip back to us — it'll confirm the same thing shortly.
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }
  };

  if (alerts.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex flex-col gap-3 rounded-lg border-2 border-red-600 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-bold tracking-wide text-red-700 uppercase">Active Alert</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{alert.full_name}</p>
            <p className="text-sm text-zinc-600">{relativeTime(alert.created_at)}</p>
            {alert.last_lat != null && alert.last_lng != null ? (
              <a
                href={`https://www.google.com/maps?q=${alert.last_lat},${alert.last_lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-blue-700 underline"
              >
                View last known location
              </a>
            ) : (
              <p className="text-sm text-zinc-500">No location available yet.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleResolve(alert.id)}
            disabled={resolvingId === alert.id}
            className="shrink-0 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {resolvingId === alert.id ? 'Marking resolved…' : 'Mark Resolved'}
          </button>
        </div>
      ))}
    </section>
  );
}

function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
