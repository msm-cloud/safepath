import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Avatar from '@/components/Avatar';
import GuardianLiveSharing from '@/components/GuardianLiveSharing';
import OnboardingScreen from '@/components/OnboardingScreen';
import RoleBadge from '@/components/RoleBadge';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';
import { usePendingOnboarding } from '@/lib/use-pending-onboarding';
import { useUserSettings } from '@/lib/user-settings-context';

// How often the repeating haptic pulse fires while an alert is unacknowledged
// — same structural idea as the fake-call ringer's setInterval loop
// (app/(tabs)/index.tsx), a different feature but the closest existing
// precedent for "repeating Haptics.notificationAsync until dismissed".
const ALARM_HAPTIC_INTERVAL_MS = 2000;
const FLASH_HALF_CYCLE_MS = 400;

type ActiveAlert = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
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
  const { session } = useAuth();
  const { t } = useLanguage();
  const { fullName, avatarPath, alarmSoundEnabled } = useUserSettings();
  const {
    checking: checkingOnboarding,
    show: showOnboarding,
    dismiss: dismissOnboarding,
  } = usePendingOnboarding(session?.user.id);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Local-only "I've seen it" flag — deliberately NOT the same thing as an
  // alert's server-side status. Silences the sound/haptics/flash below
  // without touching any alert row, so acknowledging never accidentally
  // hides a card that's still genuinely active; only "Mark Resolved" does
  // that. Starts false (not true) on purpose: if there's already an
  // unresolved alert sitting in `alerts` the moment this screen loads —
  // whether from a fresh app launch or just navigating back to this tab —
  // the alarm should demand attention immediately, not only for alerts
  // that arrive while the screen happens to already be open. Reset back to
  // false whenever a genuinely new alert is inserted (see the INSERT
  // handler below), so acknowledging alert #1 doesn't silently swallow #2.
  const [acknowledged, setAcknowledged] = useState(false);
  const isAlarming = alerts.length > 0 && !acknowledged;

  // expo-audio player for the looping alarm sound — created once, started/
  // stopped by the effect below rather than on every render. Confirmed
  // working in Expo Go on Android via a throwaway smoke test before this
  // was built (see PR description) — expo-notifications was deliberately
  // avoided instead: importing it at all crashes Expo Go on Android (see
  // lib/notifications.ts), and even setting that aside, a one-shot local
  // notification can't loop indefinitely tied to "still unacknowledged"
  // app state the way this player can.
  const alarmPlayer = useAudioPlayer(require('@/assets/sounds/sos-alarm.wav'));
  useEffect(() => {
    // expo-audio's player is an intentionally mutable handle (closer to a
    // <video> ref than to memoized render output) — setting .loop/.play()/
    // .pause() imperatively on it is how its own API is meant to be used,
    // not a violation of the immutability this rule otherwise protects.
    // eslint-disable-next-line react-hooks/immutability
    alarmPlayer.loop = true;
  }, [alarmPlayer]);

  useEffect(() => {
    if (!isAlarming) {
      alarmPlayer.pause();
      return;
    }

    // The flash overlay below stays unconditional — only sound + haptics
    // are gated on the guardian's own alarm_sound_enabled preference (see
    // its migration comment for why this is a guardian-only device
    // setting, not something the at-risk user controls).
    if (!alarmSoundEnabled) {
      alarmPlayer.pause();
      return;
    }

    alarmPlayer.seekTo(0);
    alarmPlayer.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const hapticIntervalId = setInterval(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, ALARM_HAPTIC_INTERVAL_MS);

    return () => {
      clearInterval(hapticIntervalId);
      alarmPlayer.pause();
    };
  }, [isAlarming, alarmSoundEnabled, alarmPlayer]);

  // Full-screen red/white flash — this loop's lifetime tracks `isAlarming`
  // directly (not alarmSoundEnabled): a guardian who's muted sound/haptics
  // still needs the visual signal.
  const flashAnim = useRef(new Animated.Value(0)).current;
  const flashLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    if (!isAlarming) {
      flashLoopRef.current?.stop();
      flashAnim.setValue(0);
      return;
    }

    flashLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: FLASH_HALF_CYCLE_MS,
          useNativeDriver: false, // color interpolation isn't supported by the native driver
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: FLASH_HALF_CYCLE_MS,
          useNativeDriver: false,
        }),
      ])
    );
    flashLoopRef.current.start();

    return () => flashLoopRef.current?.stop();
    // flashAnim deliberately excluded — it's a ref-derived Animated.Value,
    // stable for the component's lifetime (same reasoning as sos.tsx never
    // listing holdProgress as a dependency anywhere).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAlarming]);
  // eslint-disable-next-line react-hooks/refs -- same static-derived-interpolation pattern as sos.tsx's fillHeight; see that file's comment.
  const flashBackgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(211, 51, 51, 0.85)', 'rgba(255, 255, 255, 0.85)'],
  });

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
          'id, user_id, created_at, last_lat, last_lng, trigger_type, user:profiles!alerts_user_id_fkey(full_name, avatar_url)'
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
        user: { full_name: string; avatar_url: string | null } | null;
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
          avatar_url: row.user?.avatar_url ?? null,
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

            // A new alert re-arms the alarm even if an earlier one was
            // already acknowledged — see the `acknowledged` state's own
            // comment above.
            setAcknowledged(false);

            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
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
                  avatar_url: profile?.avatar_url ?? null,
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

  // Shown once, immediately after a first-time sign-up — see
  // lib/use-pending-onboarding.ts. checkingOnboarding is only true for
  // the brief AsyncStorage read; rendering nothing then (rather than the
  // normal Active Alerts content) avoids flashing it before onboarding
  // takes over. Doesn't affect sign-in at all: the flag is only ever set
  // by a successful sign-up, never present for a returning account.
  if (checkingOnboarding) return null;
  if (showOnboarding) {
    return <OnboardingScreen role="guardian" onFinish={dismissOnboarding} />;
  }

  return (
    <View style={styles.container}>
      {isAlarming && (
        <Pressable
          style={styles.flashOverlay}
          onPress={() => setAcknowledged(true)}
          accessibilityRole="button"
          accessibilityLabel={t('tapToSilenceAlarmHint')}
        >
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: flashBackgroundColor }]}
            pointerEvents="none"
          />
          <Text style={styles.flashHintText}>{t('tapToSilenceAlarmHint')}</Text>
        </Pressable>
      )}
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <RoleBadge style={styles.roleBadge} />
            <View style={styles.headerRow}>
              <Avatar name={fullName} url={avatarPath} size={36} />
              <Text style={styles.title}>{t('guardianActiveAlertsTitle')}</Text>
            </View>
            {/* Renders nothing unless a linked person is actively sharing
                their live location — its own data + Realtime lifecycle. */}
            <GuardianLiveSharing />
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
            <View style={styles.cardNameRow}>
              <Avatar name={item.full_name} url={item.avatar_url} size={40} />
              <View style={styles.cardNameText}>
                <Text style={styles.cardName}>{item.full_name}</Text>
                <Text style={styles.cardTime}>{relativeTime(item.created_at, now, t)}</Text>
              </View>
            </View>

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
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10, // zIndex alone isn't reliably respected on Android
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 48,
  },
  flashHintText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
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
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardNameText: {
    flex: 1,
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
