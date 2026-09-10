'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/lib/language-context';
import { createClient } from '@/lib/supabase/client';
import type { TranslationKey } from '@/lib/translations';

// Guardian-side "Recorded Live Location" — the saved location-history
// trail for each linked person who has recording turned on. Mirrors the
// mobile (guardian)/location-history.tsx screen. Plain fetch-on-mount, not
// Realtime: a 5-minute breadcrumb trail has no real-time value, same call
// as PastAlerts. The retention window is enforced server-side by the
// location_history_points SELECT policy, so the trail query needs no
// explicit time filter; either the guardian (here) or the student (mobile
// Guardians screen) can change it, per link.

const RETENTION_PRESETS_HOURS = [6, 24, 72, 168] as const;
const DEFAULT_RETENTION_HOURS = 24;
const TRAIL_LIMIT = 200;

function retentionLabelKey(hours: number): TranslationKey {
  switch (hours) {
    case 6:
      return 'recordedLocationRetention6h';
    case 72:
      return 'recordedLocationRetention3d';
    case 168:
      return 'recordedLocationRetention7d';
    default:
      return 'recordedLocationRetention24h';
  }
}

type LinkedUser = {
  linkId: string;
  userId: string;
  fullName: string;
  recording: boolean;
};

type TrailPoint = { id: string; lat: number; lng: number; recorded_at: string };

export default function RecordedLocation() {
  const { t } = useLanguage();
  // The fetch effect below runs once (empty deps) and must not re-run on a
  // language change — this ref keeps its closure on the current t(), same
  // pattern as active-alerts.tsx / live-sharing.tsx.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [users, setUsers] = useState<LinkedUser[]>([]);
  const [retentionByUser, setRetentionByUser] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);

  const loadTrail = useCallback(async (userId: string) => {
    const supabase = createClient();
    setTrailLoading(true);
    const { data } = await supabase
      .from('location_history_points')
      .select('id, lat, lng, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(TRAIL_LIMIT);
    setTrail((data ?? []) as TrailPoint[]);
    setTrailLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const { data } = await supabase
        .from('guardian_links')
        .select(
          'id, user_id, user:profiles!guardian_links_user_id_fkey(full_name, location_history_enabled)'
        )
        .eq('guardian_id', user.id)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false });

      if (cancelled) return;

      const rows = (data ?? []) as unknown as Array<{
        id: string;
        user_id: string;
        user: { full_name: string; location_history_enabled: boolean } | null;
      }>;

      setUsers(
        rows.map((r) => ({
          linkId: r.id,
          userId: r.user_id,
          fullName: r.user?.full_name || tRef.current('unnamedUser'),
          recording: r.user?.location_history_enabled ?? false,
        }))
      );

      const { data: retention } = await supabase
        .from('location_history_retention')
        .select('user_id, retention_hours')
        .eq('guardian_id', user.id);
      if (cancelled) return;
      setRetentionByUser(
        Object.fromEntries(
          ((retention ?? []) as Array<{ user_id: string; retention_hours: number }>).map((r) => [
            r.user_id,
            r.retention_hours,
          ])
        )
      );
      setLoaded(true);
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  const setRetention = async (userId: string, hours: number) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setRetentionByUser((prev) => ({ ...prev, [userId]: hours }));
    await supabase
      .from('location_history_retention')
      .upsert(
        { user_id: userId, guardian_id: user.id, retention_hours: hours },
        { onConflict: 'user_id,guardian_id' }
      );
    if (openUserId === userId) await loadTrail(userId);
  };

  const toggleTrail = (userId: string) => {
    if (openUserId === userId) {
      setOpenUserId(null);
      setTrail([]);
      return;
    }
    setOpenUserId(userId);
    setTrail([]);
    void loadTrail(userId);
  };

  // Nothing to show until we know there's at least one linked person —
  // keeps the dashboard uncluttered for a guardian with no links yet, same
  // as LiveSharing rendering nothing when no one is sharing.
  if (!loaded || users.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('recordedLocationTitle')}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t('recordedLocationSubtitle')}</p>
      </div>

      {users.map((u) => {
        const retentionHours = retentionByUser[u.userId] ?? DEFAULT_RETENTION_HOURS;
        const windowLabel = t(retentionLabelKey(retentionHours));
        const open = openUserId === u.userId;

        return (
          <div key={u.linkId} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold text-zinc-900">{u.fullName}</p>
              <span
                className={`text-sm font-medium ${
                  u.recording ? 'text-green-700' : 'text-zinc-400'
                }`}
              >
                {u.recording ? t('recordedLocationRecordingOn') : t('recordedLocationRecordingOff')}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-500">
                {t('recordedLocationRetentionLabel')}
              </span>
              <div className="flex flex-wrap gap-2">
                {RETENTION_PRESETS_HOURS.map((hours) => {
                  const active = retentionHours === hours;
                  return (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setRetention(u.userId, hours)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-zinc-300 text-zinc-600 hover:border-zinc-400'
                      }`}
                    >
                      {t(retentionLabelKey(hours))}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleTrail(u.userId)}
              className="w-fit text-sm font-medium text-blue-700 underline"
            >
              {open ? t('recordedLocationHideTrail') : t('recordedLocationViewTrail')}
            </button>

            {open && (
              <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3">
                {trailLoading && <p className="text-sm text-zinc-400">…</p>}
                {!trailLoading && trail.length === 0 && (
                  <p className="text-sm text-zinc-500">
                    {t('recordedLocationNoPoints', { window: windowLabel })}
                  </p>
                )}
                {!trailLoading && trail.length > 0 && (
                  <>
                    <p className="text-xs text-zinc-500">
                      {t('recordedLocationPointCount', { n: trail.length, window: windowLabel })}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {trail.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-zinc-700">
                            {new Date(p.recorded_at).toLocaleString()}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-blue-700 underline"
                          >
                            {t('viewOnMap')}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
