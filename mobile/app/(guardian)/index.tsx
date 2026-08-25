import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';

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

// The mobile equivalent of dashboard/app/dashboard/active-alerts.tsx — same
// Realtime subscription, same lessons already learned there applied from
// the start rather than rediscovered: a unique channel topic per effect
// mount (not a static string, which silently no-ops under a remount race —
// see fix/realtime-strictmode-channel-collision), an explicit
// setAuth(access_token) BEFORE subscribing (fix/realtime-setauth-race —
// postgres_changes authorization is keyed off the token registered on the
// socket at join time, and there's no guaranteed ordering against this
// effect running immediately on mount otherwise), and a .subscribe()
// status callback that logs any non-SUBSCRIBED state clearly instead of
// failing silently.
export default function GuardianActiveAlertsScreen() {
  const { t } = useLanguage();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Wall-clock time, refreshed every 30s so "time ago" stays fresh even
  // without a new Realtime event — captured into state (rather than
  // calling Date.now() directly during render, which must stay pure).
  const [now, setNow] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- captures wall-clock time into state on mount (render must stay pure, so Date.now() can't be called there), then keeps it fresh every 30s; see (tabs)/index.tsx for the same pattern.
    setNow(Date.now());
    const tickId = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tickId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      const { data } = await supabase
        .from('alerts')
        .select(
          'id, user_id, created_at, last_lat, last_lng, trigger_type, user:profiles!alerts_user_id_fkey(full_name)'
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (!data) {
        setLoading(false);
        return;
      }

      const rows = data as unknown as {
        id: string;
        user_id: string;
        created_at: string;
        last_lat: number | null;
        last_lng: number | null;
        trigger_type: string;
        user: { full_name: string } | null;
      }[];

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
      setLoading(false);
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

      // Not crypto.randomUUID() — that's not guaranteed available on every
      // Hermes/RN version this app might run on, and all that's actually
      // needed here is per-mount uniqueness, not cryptographic randomness.
      const topic = `mobile-guardian-active-alerts-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      channel = supabase
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
                return prev.filter((a) => a.id !== row.id);
              }
              return prev.map((a) =>
                a.id === row.id ? { ...a, last_lat: row.last_lat, last_lng: row.last_lng } : a
              );
            });
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') return;
          console.error(
            `[GuardianActiveAlerts] Realtime subscription (${topic}) status: ${status}`,
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

  const handleResolve = async (alertId: string) => {
    setResolvingId(alertId);
    const { error } = await supabase
      .from('alerts')
      .update({ status: 'resolved' })
      .eq('id', alertId);
    setResolvingId(null);

    if (!error) {
      // Remove immediately rather than waiting on the Realtime UPDATE
      // event to round-trip back — it'll confirm the same thing shortly.
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>{t('guardianActiveAlertsTitle')}</Text>
            {loading && <ActivityIndicator style={styles.loadingIndicator} />}
            {!loading && alerts.length === 0 && (
              <Text style={styles.emptyState}>{t('noActiveAlertsMessage')}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              {item.trigger_type === 'journey_overdue'
                ? t('missedCheckinTypeLabel')
                : t('sosAlertTypeLabel')}
            </Text>
            <Text style={styles.cardName}>{item.full_name}</Text>
            <Text style={styles.cardTime}>{relativeTime(item.created_at, now, t)}</Text>

            {item.last_lat != null && item.last_lng != null ? (
              <Pressable
                onPress={() =>
                  Linking.openURL(`https://www.google.com/maps?q=${item.last_lat},${item.last_lng}`)
                }
              >
                <Text style={styles.link}>{t('viewLastKnownLocationLink')}</Text>
              </Pressable>
            ) : (
              <Text style={styles.noLocation}>{t('noLocationAvailableYet')}</Text>
            )}

            <Pressable
              style={[styles.resolveButton, resolvingId === item.id && styles.buttonDisabled]}
              onPress={() => handleResolve(item.id)}
              disabled={resolvingId === item.id}
            >
              {resolvingId === item.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.resolveButtonText}>{t('markResolvedButton')}</Text>
              )}
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

function relativeTime(
  iso: string,
  now: number,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const seconds = Math.floor((now - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t('secondsAgo', { n: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  return t('hoursAgo', { n: hours });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingIndicator: {
    marginTop: 12,
  },
  emptyState: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  card: {
    borderWidth: 2,
    borderColor: '#d33',
    backgroundColor: '#fdecea',
    borderRadius: 10,
    padding: 16,
    gap: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: '#a32a1f',
    textTransform: 'uppercase',
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cardTime: {
    fontSize: 13,
    color: '#666',
  },
  link: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#2f95dc',
  },
  noLocation: {
    marginTop: 4,
    fontSize: 13,
    color: '#888',
  },
  resolveButton: {
    marginTop: 10,
    backgroundColor: '#d33',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
