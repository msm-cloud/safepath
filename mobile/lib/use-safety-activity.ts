import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const RECHECK_INTERVAL_MS = 30_000;

let lastLoggedReasons: string | null = null;

// True while anything safety-critical is running for this person: an
// active SOS (their own, or a linked student's alert a guardian is
// looking at), an active journey, or their own live location sharing.
// Prompts that could interrupt the person (update restart, what's new)
// wait for this to be false. Null until the first check finishes.
//
// RLS on alerts already limits the rows to the person's own alerts plus
// those of students they guard, so one query covers both roles.
export function useSafetyActivity(enabled: boolean): boolean | null {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [busy, setBusy] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const check = async () => {
      const result = userId ? await isSafetyActivityRunning(userId) : false;
      if (!cancelled) setBusy(result);
    };

    void check();
    const intervalId = setInterval(check, RECHECK_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      subscription.remove();
      // A later re-enable must not reuse a stale "not busy".
      setBusy(null);
    };
  }, [enabled, userId]);

  return enabled ? busy : null;
}

async function isSafetyActivityRunning(userId: string): Promise<boolean> {
  const [alerts, journeys, sharing] = await Promise.all([
    supabase.from('alerts').select('id').eq('status', 'active').limit(1),
    supabase.from('journeys').select('id').eq('user_id', userId).eq('status', 'active').limit(1),
    supabase
      .from('live_sharing_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1),
  ]);

  // Unknown state (offline, server error) counts as busy: interrupting an
  // emergency is worse than showing a prompt a little later.
  const reasons = [
    alerts.error || journeys.error || sharing.error ? 'check failed' : null,
    alerts.data?.length ? 'sos' : null,
    journeys.data?.length ? 'journey' : null,
    sharing.data?.length ? 'live sharing' : null,
  ].filter((reason) => reason !== null);
  const summary = reasons.join(', ');
  if (summary !== lastLoggedReasons) {
    console.log(`[app-updates] prompts ${summary ? `held: ${summary}` : 'clear'}`);
    lastLoggedReasons = summary;
  }
  return reasons.length > 0;
}
