import { t } from '@/lib/translations';
import type { Language } from '@/lib/translations';
import { createClient } from '@/lib/supabase/server';

const PAST_ALERTS_LIMIT = 20;

type PastAlertRow = {
  id: string;
  user_id: string;
  full_name: string;
  created_at: string;
  resolved_at: string | null;
  last_lat: number | null;
  last_lng: number | null;
};

// Resolved alerts for this guardian's linked users. A plain page-load
// fetch — unlike ActiveAlerts, this deliberately isn't Realtime/live:
// resolved alerts aren't time-critical the way active ones are, so
// refetching on every page load is enough.
//
// Covered by the same alerts_select_own_or_accepted_guardian RLS policy
// ActiveAlerts relies on (see
// supabase/migrations/20260821190612_alerts.sql) — that policy's USING
// clause has no `status` filter at all:
//   user_id = auth.uid()
//   or exists (select 1 from guardian_links gl where gl.user_id = alerts.user_id
//              and gl.guardian_id = auth.uid() and gl.status = 'accepted')
// so it already permits a guardian to SELECT a linked user's resolved
// alerts, not just active ones. No new migration needed for this feature.
//
// This is a Server Component, so it can't consume LanguageContext (React
// Context only works in Client Components) — `language` comes in as a
// plain prop from dashboard/page.tsx instead, and every string here uses
// the pure t(language, key) function rather than the useLanguage() hook.
export default async function PastAlerts({ language }: { language: Language }) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('alerts')
    .select(
      'id, user_id, created_at, resolved_at, last_lat, last_lng, user:profiles!alerts_user_id_fkey(full_name)'
    )
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: false })
    .limit(PAST_ALERTS_LIMIT);

  const rows = data as unknown as Array<{
    id: string;
    user_id: string;
    created_at: string;
    resolved_at: string | null;
    last_lat: number | null;
    last_lng: number | null;
    user: { full_name: string } | null;
  }> | null;

  const alerts: PastAlertRow[] = (rows ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    full_name: row.user?.full_name || t(language, 'unnamedUser'),
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    last_lat: row.last_lat,
    last_lng: row.last_lng,
  }));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{t(language, 'pastAlertsTitle')}</h2>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {!error && alerts.length === 0 && (
        <p className="text-sm text-zinc-500">{t(language, 'noResolvedAlertsYet')}</p>
      )}

      {!error && alerts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex flex-col gap-1 rounded-md border border-zinc-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-zinc-900">{alert.full_name}</p>
                <p className="text-zinc-500">
                  {new Date(alert.created_at).toLocaleString()}
                  {alert.resolved_at
                    ? ` — ${formatDuration(alert.created_at, alert.resolved_at, language)}`
                    : ''}
                </p>
              </div>
              {alert.last_lat != null && alert.last_lng != null ? (
                <a
                  href={`https://www.google.com/maps?q=${alert.last_lat},${alert.last_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-blue-700 underline"
                >
                  {t(language, 'viewLastKnownLocation')}
                </a>
              ) : (
                <p className="text-sm text-zinc-400">{t(language, 'noLocationRecorded')}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// e.g. "Active for 12 minutes" / "Active for 2h 5m" / "Active for 3 days".
function formatDuration(startIso: string, endIso: string, language: Language): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalMinutes = Math.max(0, Math.round(ms / 60000));

  if (totalMinutes < 1) return t(language, 'activeForLessThanMinute');
  if (totalMinutes < 60) {
    return t(language, 'activeForMinutes', { n: totalMinutes, s: totalMinutes === 1 ? '' : 's' });
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes > 0
      ? t(language, 'activeForHoursMinutes', { h: hours, m: minutes })
      : t(language, 'activeForHours', { h: hours, s: hours === 1 ? '' : 's' });
  }

  const days = Math.floor(hours / 24);
  return t(language, 'activeForDays', { d: days, s: days === 1 ? '' : 's' });
}
