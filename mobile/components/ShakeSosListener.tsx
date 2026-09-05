import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useShakeDetector } from '@/lib/shake-detector';
import { triggerSos as triggerSosShared, type EmergencyContact } from '@/lib/sos-trigger';
import { supabase } from '@/lib/supabase';
import { useUserSettings } from '@/lib/user-settings-context';

const COUNTDOWN_SECONDS = 3;
const PULSE_HALF_CYCLE_MS = 500;

// Animated.createAnimatedComponent at module scope, not inside the
// component — recreating this on every render would defeat the point of
// memoizing it at all (same reason styles.* is a module-level
// StyleSheet.create call rather than an inline object).
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Mounted once at the root layout (app/_layout.tsx), inside both
// AuthProvider and UserSettingsProvider, so it's active on every screen
// while signed in — not just the SOS tab. The sensor subscription itself
// (useShakeDetector) only exists at all while BOTH the person is
// authenticated AND has the Settings toggle on; it is not merely
// disabled otherwise, it's genuinely not listening.
//
// Calls the exact same lib/sos-trigger.ts function the hold button on
// app/(tabs)/sos.tsx uses — this component fetches its own
// emergencyContacts/fullName cache (mirroring what that screen already
// does) since the two aren't sharing React state, but the actual
// alert-creation/offline-SMS logic is one shared function, not a second
// copy of it. Once an alert is created this way, the SOS screen picks it
// up automatically next time it's focused via its own existing
// active-alert resync effect — no extra plumbing needed for that.
export default function ShakeSosListener() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const { loaded, shakeSosEnabled } = useUserSettings();
  const userId = session?.user.id;

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[] | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    supabase
      .from('emergency_contacts')
      .select('id, name, phone')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (!cancelled) setEmergencyContacts(data ?? []);
      });

    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setFullName(data?.full_name ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const [confirming, setConfirming] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [sending, setSending] = useState(false);

  // Ignore a second shake pattern detected while the overlay's already up
  // (e.g. still shaking) — don't restart or stack countdowns. Safe to
  // depend on `confirming` directly here (rather than a ref) since
  // useShakeDetector keeps its own ref to whatever callback was passed on
  // the latest render — this function's identity changing when
  // `confirming` changes doesn't cause a re-subscription, only the
  // sensor-listening effect's `enabled` dependency does that.
  const handleShakeDetected = useCallback(() => {
    if (confirming) return;
    setCountdown(COUNTDOWN_SECONDS);
    setConfirming(true);
  }, [confirming]);

  useShakeDetector(handleShakeDetected, !!userId && loaded && shakeSosEnabled);

  useEffect(() => {
    if (!confirming) return;

    if (countdown === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the countdown reaching 0 is the trigger to actually start sending; this isn't syncing external state, it's the state-machine transition itself.
      setSending(true);
      (async () => {
        if (!userId) {
          setSending(false);
          setConfirming(false);
          return;
        }
        const result = await triggerSosShared({ userId, emergencyContacts, fullName, t });
        setSending(false);
        setConfirming(false);
        Haptics.notificationAsync(
          result.mode === 'failed'
            ? Haptics.NotificationFeedbackType.Error
            : Haptics.NotificationFeedbackType.Success
        );
        if (result.mode === 'failed') {
          Alert.alert(t('sosCreateError'), result.message);
        }
      })();
      return;
    }

    // Fires once per tick (3, 2, 1) — including immediately when the
    // countdown first mounts, since this effect runs then too. No new
    // "repeating SOS-specific haptics" pattern already existed to copy
    // (the hold button has none at all); structurally this mirrors the
    // fake-call ringer's setInterval-based Haptics.notificationAsync loop
    // in app/(tabs)/index.tsx, just driven by this countdown's own
    // setTimeout tick instead of a separate interval.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [confirming, countdown, userId, emergencyContacts, fullName, t]);

  // Pulsing red background while confirming — replaces the previous static
  // rgba(122,18,18,0.96) fill. Stops (freezes, doesn't jump) once sending
  // starts, since that's a brief, already-distinct spinner phase.
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    if (!confirming || sending) {
      pulseLoopRef.current?.stop();
      return;
    }

    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: PULSE_HALF_CYCLE_MS,
          useNativeDriver: false, // color interpolation isn't supported by the native driver
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: PULSE_HALF_CYCLE_MS,
          useNativeDriver: false,
        }),
      ])
    );
    pulseLoopRef.current.start();

    return () => pulseLoopRef.current?.stop();
    // pulseAnim deliberately excluded — it's a ref-derived Animated.Value,
    // stable for the component's lifetime (same reasoning as sos.tsx never
    // listing holdProgress as a dependency anywhere).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirming, sending]);
  // eslint-disable-next-line react-hooks/refs -- same static-derived-interpolation pattern as sos.tsx's fillHeight; see that file's comment.
  const overlayBackgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(122, 18, 18, 0.96)', 'rgba(184, 30, 30, 0.96)'],
  });

  const handleCancel = () => {
    if (sending) return; // already in flight — mirrors the hold button's own "no cancel once creating" behavior
    setConfirming(false);
  };

  if (!confirming) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleCancel}>
      <AnimatedPressable
        style={[styles.overlay, { backgroundColor: overlayBackgroundColor }]}
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel={t('cancelButton')}
      >
        <Text style={styles.title}>{t('shakeDetectedTitle')}</Text>

        {sending ? (
          <ActivityIndicator color="#fff" size="large" style={styles.spinner} />
        ) : (
          <>
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <Text style={styles.subtitle}>{t('shakeCountdownMessage', { n: countdown })}</Text>
            <Text style={styles.cancelButton}>{t('cancelButton')}</Text>
            <Text style={styles.tapHint}>{t('tapAnywhereToCancelHint')}</Text>
          </>
        )}
      </AnimatedPressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // backgroundColor intentionally not set here — animated between two red
    // shades via overlayBackgroundColor above instead of a static value.
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  countdownNumber: {
    color: '#fff',
    fontSize: 72,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 12,
  },
  cancelButton: {
    marginTop: 24,
    color: '#7a1212',
    backgroundColor: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tapHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 8,
  },
});
