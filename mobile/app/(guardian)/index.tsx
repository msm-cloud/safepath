import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';

import GuardianAlertCard from '@/components/GuardianAlertCard';
import GuardianLiveSharing from '@/components/GuardianLiveSharing';
import LocationToggleCard, { type LocationToggleNotice } from '@/components/LocationToggleCard';
import OnboardingScreen from '@/components/OnboardingScreen';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import IconTile from '@/components/ui/IconTile';
import PhoneNotSavedNotice from '@/components/ui/PhoneNotSavedNotice';
import Screen from '@/components/ui/Screen';
import SettingsLoadNotice from '@/components/ui/SettingsLoadNotice';
import ThemedText from '@/components/ui/Text';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';
import { useGuardianLinkRevoked } from '@/lib/use-guardian-link-revoked';
import { useLocationHistory } from '@/lib/use-location-history';
import { usePendingOnboarding } from '@/lib/use-pending-onboarding';
import { useUserSettings } from '@/lib/user-settings-context';
import { useTheme } from '@/theme';

// Repeating vibration pattern for an unacknowledged alert, as
// [wait, vibrate, wait, vibrate, ...] milliseconds. Handed to the OS
// vibrator service once, as a looping pattern (see the effect below) —
// NOT re-issued from JS on an interval. When the guardian's phone is
// locked or SafePath is backgrounded (the exact situation an SOS alarm
// has to punch through) React Native suspends the JS timer queue
// (onHostPause), so the previous setInterval-driven
// Haptics.notificationAsync loop simply stopped firing until the app was
// foregrounded again. A native looping pattern keeps going on its own,
// the same way the expo-audio loop does.
const ALARM_VIBRATION_PATTERN = [0, 600, 400];
const FLASH_HALF_CYCLE_MS = 400;

const ICONS = {
  invite: { ios: 'plus', android: 'add', web: 'add' },
  allClear: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
  shareLocation: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
} as const;

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
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useLanguage();
  const { colors, radius, spacing } = useTheme();
  const { fullName, avatarPath, alarmSoundEnabled } = useUserSettings();
  // The guardian's own reciprocal sharing (same hook and flag as the
  // share-location screen), so it is visible and reconciled from Home.
  const locationHistory = useLocationHistory();
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
  useGuardianLinkRevoked((userId) => setAlerts((prev) => prev.filter((a) => a.user_id !== userId)));
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

    // Single call — the OS vibrator service loops the pattern itself, so
    // it keeps buzzing while locked/backgrounded (see the pattern const's
    // comment). Needs android.permission.VIBRATE, already merged into the
    // manifest: React Native core declares it, and expo-haptics' config
    // plugin adds it too.
    Vibration.vibrate(ALARM_VIBRATION_PATTERN, true);

    return () => {
      Vibration.cancel();
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
  const handleShareLocationToggle = (next: boolean) => {
    if (locationHistory.busy || locationHistory.loading) return;
    if (next) {
      locationHistory.start();
    } else {
      locationHistory.stop();
    }
  };

  if (checkingOnboarding) return null;
  if (showOnboarding) {
    return <OnboardingScreen role="guardian" onFinish={dismissOnboarding} />;
  }

  const shareLocationWarnings: LocationToggleNotice[] = [];
  if (locationHistory.enabled && locationHistory.mode === 'foreground') {
    shareLocationWarnings.push({
      message: t('guardianShareLocationForegroundWarning'),
      openSettings: true,
    });
  }
  if (locationHistory.error === 'permission-denied') {
    shareLocationWarnings.push({
      message: t('guardianShareLocationPermissionDenied'),
      openSettings: true,
    });
  }
  const shareLocationError =
    locationHistory.error === 'start-failed'
      ? t('guardianShareLocationStartError')
      : locationHistory.error === 'stop-failed'
        ? t('guardianShareLocationStopError')
        : locationHistory.error === 'save-failed'
          ? t('guardianShareLocationSaveError')
          : null;

  return (
    <Screen scroll={false} padded={false} edges={['top']}>
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
            <View
              style={{
                marginHorizontal: spacing.xl,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.pill,
                backgroundColor: colors.surface,
              }}
            >
              <ThemedText variant="label" align="center">
                {t('tapToSilenceAlarmHint')}
              </ThemedText>
            </View>
          </Pressable>
        )}
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.xl,
            paddingTop: spacing.lg,
            gap: spacing.md,
          }}
          ListHeaderComponent={
            <View style={{ gap: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar name={fullName} url={avatarPath} size={36} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color="textMuted">
                    {t('guardianHomeEyebrow')}
                  </ThemedText>
                  <ThemedText variant="h2">{t('guardianHomeTitle')}</ThemedText>
                </View>
                <Button
                  title={t('guardianHomeInviteButton')}
                  icon={ICONS.invite}
                  variant="primary"
                  size="small"
                  fullWidth={false}
                  onPress={() => router.navigate('/link')}
                />
              </View>
              <PhoneNotSavedNotice />
              <SettingsLoadNotice />
              {loading && <ActivityIndicator color={colors.primary} />}
              {!loading && alerts.length === 0 && (
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <IconTile icon={ICONS.allClear} tone="success" size={40} />
                  <ThemedText variant="bodySm" color="textSecondary" style={{ flex: 1 }}>
                    {t('noActiveAlertsMessage')}
                  </ThemedText>
                </Card>
              )}
            </View>
          }
          ListFooterComponent={
            <View style={{ gap: spacing.lg, marginTop: spacing.sm }}>
              {/* Its own data + Realtime lifecycle; shows an empty state when
                nobody is sharing. */}
              <GuardianLiveSharing />
              <LocationToggleCard
                title={t('guardianShareLocationTitle')}
                hint={t('guardianShareLocationSubtitle')}
                icon={ICONS.shareLocation}
                value={locationHistory.enabled}
                busy={locationHistory.busy}
                loading={locationHistory.loading}
                onValueChange={handleShareLocationToggle}
                onStatus={t('guardianShareLocationOnStatus')}
                warnings={shareLocationWarnings}
                error={shareLocationError}
              />
            </View>
          }
          renderItem={({ item }) => (
            <GuardianAlertCard
              alert={item}
              timeAgo={relativeTime(item.created_at, now, t)}
              resolving={resolvingId === item.id}
              onResolve={() => handleResolve(item.id)}
            />
          )}
        />
      </View>
    </Screen>
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
});
