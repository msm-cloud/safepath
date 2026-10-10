'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/lib/language-context';
import { createClient } from '@/lib/supabase/client';
import type { TranslationKey } from '@/lib/translations';
import { buttonClasses } from '@/components/ui/Button';
import { SpeakerOffIcon } from '@/components/ui/icons';

// Same synthesized siren asset as mobile (mobile/assets/sounds/sos-alarm.wav)
// — served from public/ so a plain <audio src> can reach it. No vibration
// API worth relying on in a desktop/laptop browser, so sound + the pulsing
// card border below are this surface's whole "repeating" signal, unlike
// mobile's sound+haptics+flash combination.
const ALARM_SOUND_SRC = '/sounds/sos-alarm.wav';

type ActiveAlert = {
  id: string;
  user_id: string;
  full_name: string;
  created_at: string;
  last_lat: number | null;
  last_lng: number | null;
  trigger_type: string;
};

type AlertsChangeRow = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  last_lat: number | null;
  last_lng: number | null;
  trigger_type: string;
};

// Subscribes to Realtime changes on `alerts` (INSERT + UPDATE) for
// whichever rows RLS lets this guardian see — i.e. only their linked
// users' alerts, the same scope a direct SELECT already has (see
// supabase/migrations/20260823145243_enable_realtime_on_alerts.sql). No
// client-side filtering by guardian_links needed; the server already only
// delivers what this connection is allowed to see.
export default function ActiveAlerts() {
  const { t } = useLanguage();
  // The Realtime subscription effect below is deliberately untouched
  // (empty dep array, intentional — see its own comments) — it must not
  // re-run when the language changes. This ref gives its closures access
  // to the always-current t() without needing to be a dependency.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  // Bumped every 30s purely to force a re-render so "how long ago" stays
  // fresh even when no new realtime event has arrived.
  const [, setTick] = useState(0);

  useEffect(() => {
    const tickId = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(tickId);
  }, []);

  // Local-only "seen it" flag, same semantics as the mobile guardian
  // screen's `acknowledged` state — silences the alarm sound without
  // touching any alert row; only "Mark Resolved" does that. Starts false so
  // an alert already active when this page loads alarms immediately, not
  // only ones that arrive while the tab happens to already be open. Reset
  // to false on every genuinely new INSERT (below), so acknowledging alert
  // #1 doesn't silently swallow #2.
  const [acknowledged, setAcknowledged] = useState(false);
  const isAlarming = alerts.length > 0 && !acknowledged;

  // Browsers block <audio>.play() with sound until a real user gesture has
  // happened on the page — there's no way to pre-grant this across page
  // loads, so a one-time banner (rendered below) asks for that gesture
  // itself: clicking it does a play()+immediate pause() on this exact
  // <audio> element, which is enough to unlock later programmatic play()
  // calls on it for the rest of this page's lifetime.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // The full-screen alarm below covers the page until it's clicked once.
  // Reset on every new alert, like `acknowledged`.
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const overlayButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleEnableSound = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        setAudioUnlocked(true);
      })
      .catch(() => {
        // Still blocked (e.g. the click wasn't treated as a "real" gesture
        // by this browser) — leave the banner up so they can try again.
      });
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isAlarming && audioUnlocked) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Autoplay still blocked despite the earlier unlock click — nothing
        // more to do client-side; the pulsing card border still carries the
        // visual signal regardless.
      });
    } else {
      audio.pause();
    }
  }, [isAlarming, audioUnlocked]);

  const showOverlay = isAlarming && !audioUnlocked && !overlayDismissed;
  const firstAlert = alerts[0];

  useEffect(() => {
    if (showOverlay) overlayButtonRef.current?.focus();
  }, [showOverlay]);

  // Flashing tab title, so an alarm in a background tab still shows.
  const alarmTitle = firstAlert ? t('sosTabTitle', { name: firstAlert.full_name }) : null;
  useEffect(() => {
    if (!isAlarming || !alarmTitle) return;
    const original = document.title;
    let flashOn = false;
    const id = setInterval(() => {
      flashOn = !flashOn;
      document.title = flashOn ? alarmTitle : original;
    }, 1000);
    return () => {
      clearInterval(id);
      document.title = original;
    };
  }, [isAlarming, alarmTitle]);

  // One click anywhere on the alarm turns the sound on (a click is the
  // gesture browsers need) and uncovers the page. It's dismissed even if the
  // browser still refuses to play, so it can never trap the guardian.
  const handleOverlayClick = () => {
    setOverlayDismissed(true);
    handleEnableSound();
  };

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadInitial() {
      const { data } = await supabase
        .from('alerts')
        .select(
          'id, user_id, created_at, last_lat, last_lng, trigger_type, user:profiles!alerts_user_id_fkey(full_name)'
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
        trigger_type: string;
        user: { full_name: string } | null;
      }>;

      setAlerts(
        rows.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          created_at: row.created_at,
          last_lat: row.last_lat,
          last_lng: row.last_lng,
          trigger_type: row.trigger_type,
          full_name: row.user?.full_name || tRef.current('unnamedUser'),
        }))
      );
    }

    loadInitial();

    let channel: RealtimeChannel | null = null;

    async function setupRealtimeSubscription() {
      // Realtime's postgres_changes authorization is keyed off the access
      // token registered on the socket at the moment a channel's join is
      // actually sent — RealtimeChannel.subscribe() snapshots
      // socket.accessTokenValue synchronously into the join payload. The
      // base client (@supabase/supabase-js's SupabaseClient) does
      // automatically wire realtime.setAuth() to auth state changes
      // internally, so this isn't a "missing entirely" problem — but that
      // wiring is driven by an async onAuthStateChange/INITIAL_SESSION
      // event with no guaranteed ordering against this effect running
      // immediately on mount. If our channel finishes joining before that
      // event fires, the join was already sent with no/stale
      // access_token: the server still replies `status: ok` (joining
      // doesn't require auth), but every subsequent postgres_changes
      // event is then silently filtered as unauthenticated. Explicitly
      // awaiting the session and setting it BEFORE we ever call
      // .subscribe() makes the ordering deterministic instead of racing
      // it.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      if (cancelled) return;

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

      channel = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'alerts' },
          async (payload) => {
            const row = payload.new as AlertsChangeRow;
            if (row.status !== 'active') return;

            // A new alert re-arms the alarm even if an earlier one was
            // already acknowledged — see the `acknowledged` state's own
            // comment above.
            setAcknowledged(false);
            setOverlayDismissed(false);

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
                  trigger_type: row.trigger_type,
                  full_name: profile?.full_name || tRef.current('unnamedUser'),
                },
                ...prev,
              ];
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'alerts' },
          (payload) => {
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
          }
        )
        .subscribe((status, err) => {
          // The original bug produced no error at all — the join was just
          // silently never sent. Logging every non-SUBSCRIBED status (not
          // just err) means a failed/stuck join is now always visible in the
          // console instead of only showing up as "no alerts ever appear".
          if (status === 'SUBSCRIBED') return;
          console.error(`[ActiveAlerts] Realtime subscription (${topic}) status: ${status}`, err);
        });
    }

    setupRealtimeSubscription();

    return () => {
      cancelled = true;
      // `channel` is this specific effect invocation's own instance
      // (captured by closure, and now registered under its own unique
      // topic) — this always tears down exactly the channel this run
      // created, never a different run's. It may still be null if the
      // component unmounted before the async setup above (getSession +
      // setAuth) finished — nothing to remove in that case.
      if (channel) {
        supabase.removeChannel(channel);
      }
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

  // Renders nothing only once there's genuinely nothing left to show —
  // unlike before, that's no longer just "alerts.length === 0": the sound-
  // unlock banner still needs to show up front, before any alert has ever
  // arrived, so a guardian who leaves this tab open gets sound on the very
  // first alert rather than only from the second one onward.
  if (alerts.length === 0 && audioUnlocked) return null;

  return (
    <>
      {/* Always mounted (not just while alarming) so the unlock click below
          and the alarm-start effect above are both acting on one stable
          element for the page's whole lifetime — swapping it in and out of
          the tree would lose the unlock. Hidden from view; it's audio-only. */}
      <audio ref={audioRef} src={ALARM_SOUND_SRC} preload="auto" className="hidden" />

      {/* A direct child of the page's <main>, so sticky keeps "alerts are
          silent" in view however far the page scrolls. */}
      {!audioUnlocked && (
        <div
          role="status"
          className="sticky top-0 z-10 flex flex-col gap-3 rounded-md border-2 border-warning bg-warning-soft p-4 text-on-warning-soft shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex gap-3">
            <span className="mt-0.5 shrink-0">
              <SpeakerOffIcon size={24} />
            </span>
            <div>
              <p className="type-label">{t('soundAlertsOffTitle')}</p>
              <p className="type-body-sm">{t('enableSoundAlertsHint')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEnableSound}
            className={`shrink-0 ${buttonClasses({ size: 'small' })}`}
          >
            {t('enableSoundAlertsButton')}
          </button>
        </div>
      )}

      {showOverlay && firstAlert && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="sos-overlay-title"
          aria-describedby="sos-overlay-hint"
          onClick={handleOverlayClick}
          className="sos-overlay-flash fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-4 p-gutter text-center text-on-danger"
        >
          <p className="type-label tracking-wide uppercase">
            {firstAlert.trigger_type === 'journey_overdue'
              ? t('missedCheckinLabel')
              : t('activeAlertLabel')}
          </p>
          <p id="sos-overlay-title" className="type-h1">
            {firstAlert.full_name}
            {alerts.length > 1 && ` +${alerts.length - 1}`}
          </p>
          <SpeakerOffIcon size={32} />
          <p id="sos-overlay-hint" className="max-w-md type-body">
            {t('sosOverlayHint')}
          </p>
          <button
            ref={overlayButtonRef}
            type="button"
            className={buttonClasses({ variant: 'emergencyCall' })}
          >
            {t('sosOverlayButton')}
          </button>
        </div>
      )}

      {alerts.length > 0 && (
        <section className="flex flex-col gap-3">
          {isAlarming && (
            <button
              type="button"
              onClick={() => setAcknowledged(true)}
              className={`self-start ${buttonClasses({ variant: 'dangerOutline', size: 'small' })}`}
            >
              {t('silenceAlarmButton')}
            </button>
          )}

          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex flex-col gap-4 rounded-xl bg-danger p-4 text-on-danger shadow-sos sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                isAlarming ? 'sos-alert-pulse' : ''
              }`}
            >
              <div>
                <p className="type-label tracking-wide uppercase">
                  {alert.trigger_type === 'journey_overdue'
                    ? t('missedCheckinLabel')
                    : t('activeAlertLabel')}
                </p>
                <p className="mt-1 type-title">{alert.full_name}</p>
                <p className="type-body-sm">{relativeTime(alert.created_at, t)}</p>
                {alert.last_lat != null && alert.last_lng != null ? (
                  <a
                    href={`https://www.google.com/maps?q=${alert.last_lat},${alert.last_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="type-label underline"
                  >
                    {t('viewLastKnownLocation')}
                  </a>
                ) : (
                  <p className="type-body-sm">{t('noLocationAvailableYet')}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleResolve(alert.id)}
                disabled={resolvingId === alert.id}
                className={`shrink-0 ${buttonClasses({ variant: 'emergencyCall', size: 'small', loading: resolvingId === alert.id })}`}
              >
                {resolvingId === alert.id ? t('markingResolvedButton') : t('markResolvedButton')}
              </button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function relativeTime(
  iso: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t('secondsAgo', { n: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  return t('hoursAgo', { n: hours });
}
