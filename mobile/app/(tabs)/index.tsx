import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import Avatar from '@/components/Avatar';
import OnboardingScreen from '@/components/OnboardingScreen';
import RoleBadge from '@/components/RoleBadge';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { getBestEffortLocation } from '@/lib/location';
import { cancelScheduledNotification, scheduleArrivalCheckNotification } from '@/lib/notifications';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';
import { useLiveSharing } from '@/lib/use-live-sharing';
import { usePendingOnboarding } from '@/lib/use-pending-onboarding';
import { useUserSettings } from '@/lib/user-settings-context';

const DURATION_OPTIONS_MINUTES = [15, 30, 45, 60];
const EXTEND_MINUTES = 15;

// Fake call escape — delay options (seconds) shown when "Fake Call" is
// tapped, plus the repeat interval for the ringing vibration.
const FAKE_CALL_DELAY_OPTIONS_SECONDS = [0, 10, 30];
const FAKE_CALL_RING_HAPTIC_INTERVAL_MS = 1200;

type FakeCallState = 'idle' | 'ringing' | 'in_call';

type JourneyStatus = 'active' | 'arrived_safe' | 'alert_triggered' | 'cancelled';

type Journey = {
  id: string;
  destination_note: string | null;
  expected_arrival_at: string;
  grace_period_minutes: number;
  status: JourneyStatus;
};

export default function HomeScreen() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const {
    loaded: settingsLoaded,
    fakeCallEnabled,
    fakeCallCallerName,
    fullName,
    avatarPath,
  } = useUserSettings();
  const userId = session?.user.id;
  const {
    checking: checkingOnboarding,
    show: showOnboarding,
    dismiss: dismissOnboarding,
  } = usePendingOnboarding(userId);

  const liveSharing = useLiveSharing();

  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  // Wall-clock time, refreshed every 30s so "time remaining" stays fresh
  // even though no new data arrived — same trick the dashboard's
  // ActiveAlerts card uses for its "how long ago" display. Captured into
  // state via the effect below rather than calling Date.now() directly
  // during render, since render must stay pure. Starts at 0; by the time
  // `journey` is actually loaded (an async fetch) the effect below has
  // already run and set a real value, so there's no visible flash.
  const [now, setNow] = useState(0);

  const [selectedDuration, setSelectedDuration] = useState(30);
  const [destinationNote, setDestinationNote] = useState('');
  const [starting, setStarting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const destinationNoteInputRef = useRef<TextInput>(null);
  const keyboardHeight = useKeyboardHeight();

  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // In-memory only — covers the common case (marking arrived / adding time
  // in the same app session that started the journey). If the app was
  // killed and reopened, this is lost and the locally-scheduled reminder
  // can't be cancelled early; it's just a slightly-stale reminder in that
  // case, not a safety gap, since the real mechanism is the server-side
  // cron job, which doesn't depend on this at all.
  const [notificationId, setNotificationId] = useState<string | null>(null);

  // --- Fake call escape ---
  const [showDelayPicker, setShowDelayPicker] = useState(false);
  const [fakeCallState, setFakeCallState] = useState<FakeCallState>('idle');
  const [callElapsedSeconds, setCallElapsedSeconds] = useState(0);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringHapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRingHaptics = useCallback(() => {
    if (ringHapticIntervalRef.current) {
      clearInterval(ringHapticIntervalRef.current);
      ringHapticIntervalRef.current = null;
    }
  }, []);

  // Clears every pending timer/interval on unmount — the delay picker's
  // setTimeout, the ringing haptic loop, and the in-call elapsed-time
  // ticker are otherwise all capable of outliving the component.
  useEffect(() => {
    return () => {
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      stopRingHaptics();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [stopRingHaptics]);

  const startRinging = useCallback(() => {
    setFakeCallState('ringing');
    // Fires immediately, then repeats — approximates a ringtone's repeated
    // buzz using only what's already available (no audio library in this
    // environment; see Settings toggle hint / PR notes for why a
    // synthesized tone was skipped rather than pulled in as a new dep).
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    ringHapticIntervalRef.current = setInterval(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, FAKE_CALL_RING_HAPTIC_INTERVAL_MS);
  }, []);

  const handleFakeCallDelaySelected = (delaySeconds: number) => {
    setShowDelayPicker(false);
    if (delaySeconds === 0) {
      startRinging();
      return;
    }
    // The delay is the whole point — organic-looking, not an obvious
    // instant response to the person's own tap.
    ringTimeoutRef.current = setTimeout(startRinging, delaySeconds * 1000);
  };

  const handleAcceptFakeCall = () => {
    stopRingHaptics();
    setCallElapsedSeconds(0);
    setFakeCallState('in_call');
    callTimerRef.current = setInterval(() => {
      setCallElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleDeclineFakeCall = () => {
    stopRingHaptics();
    setFakeCallState('idle');
  };

  const handleEndFakeCall = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setFakeCallState('idle');
  };

  useFocusEffect(
    useCallback(() => {
      // Captures wall-clock time into state (rather than calling Date.now()
      // directly during render, which must stay pure) on every focus, then
      // keeps it fresh every 30s while this tab stays focused.
      setNow(Date.now());
      const id = setInterval(() => setNow(Date.now()), 30000);
      return () => clearInterval(id);
    }, [])
  );

  // Resyncs the most recent journey from the server every time this tab
  // gains focus — same pattern as the SOS screen's active-alert resync, so
  // a journey the cron already flipped to alert_triggered (or one marked
  // arrived_safe from another device) is always reflected accurately
  // rather than showing a stale 'active' state.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;

      supabase
        .from('journeys')
        .select('id, destination_note, expected_arrival_at, grace_period_minutes, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) {
            setJourney(data);
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const handleStart = async () => {
    if (!userId) return;
    setCreateError(null);
    setStarting(true);

    const location = await getBestEffortLocation();
    const expectedArrivalAt = new Date(Date.now() + selectedDuration * 60000);

    const { data, error } = await supabase
      .from('journeys')
      .insert({
        user_id: userId,
        destination_note: destinationNote.trim() || null,
        expected_arrival_at: expectedArrivalAt.toISOString(),
        last_lat: location?.lat ?? null,
        last_lng: location?.lng ?? null,
      })
      .select('id, destination_note, expected_arrival_at, grace_period_minutes, status')
      .single();

    setStarting(false);

    if (error || !data) {
      console.error('[Journey] Failed to start journey:', error);
      setCreateError(t('journeyCreateError'));
      return;
    }

    setJourney(data);
    setDestinationNote('');

    const newNotificationId = await scheduleArrivalCheckNotification({
      title: t('arrivalCheckNotificationTitle'),
      body: t('arrivalCheckNotificationBody'),
      fireAt: expectedArrivalAt,
    });
    setNotificationId(newNotificationId);
  };

  const handleArrivedSafely = async () => {
    if (!journey) return;
    setActionError(null);
    setActionPending(true);

    const { error } = await supabase
      .from('journeys')
      .update({ status: 'arrived_safe', resolved_at: new Date().toISOString() })
      .eq('id', journey.id);

    setActionPending(false);

    if (error) {
      console.error('[Journey] Failed to mark journey arrived safely:', error);
      setActionError(t('journeyResolveError'));
      return;
    }

    await cancelScheduledNotification(notificationId);
    setNotificationId(null);
    setJourney(null);
  };

  const handleAddTime = async () => {
    if (!journey) return;
    setActionError(null);
    setActionPending(true);

    const newExpectedArrivalAt = new Date(
      new Date(journey.expected_arrival_at).getTime() + EXTEND_MINUTES * 60000
    );

    const { error } = await supabase
      .from('journeys')
      .update({ expected_arrival_at: newExpectedArrivalAt.toISOString() })
      .eq('id', journey.id);

    setActionPending(false);

    if (error) {
      console.error('[Journey] Failed to extend journey:', error);
      setActionError(t('journeyExtendError'));
      return;
    }

    setJourney({ ...journey, expected_arrival_at: newExpectedArrivalAt.toISOString() });

    // Reschedule the local reminder to match — cancel-then-reschedule
    // rather than trying to move the existing one, since expo-notifications
    // has no "update trigger time" API.
    await cancelScheduledNotification(notificationId);
    const newNotificationId = await scheduleArrivalCheckNotification({
      title: t('arrivalCheckNotificationTitle'),
      body: t('arrivalCheckNotificationBody'),
      fireAt: newExpectedArrivalAt,
    });
    setNotificationId(newNotificationId);
  };

  const openNearbySearch = (query: string) => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
  };

  const handleLiveSharingToggle = (next: boolean) => {
    if (liveSharing.busy || liveSharing.loading) return;
    if (next) {
      liveSharing.start();
    } else {
      liveSharing.stop();
    }
  };

  const minutesUntil = journey
    ? Math.round((new Date(journey.expected_arrival_at).getTime() - now) / 60000)
    : 0;

  // Shown once, immediately after a first-time sign-up — see
  // lib/use-pending-onboarding.ts. checkingOnboarding is only true for
  // the brief AsyncStorage read; rendering nothing then (rather than the
  // normal Home content) avoids flashing Home before onboarding takes
  // over. Doesn't affect sign-in at all: the flag is only ever set by a
  // successful sign-up, never present for a returning account.
  if (checkingOnboarding) return null;
  if (showOnboarding) {
    return <OnboardingScreen role="user" onFinish={dismissOnboarding} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // See components/SettingsScreen.tsx's comment for the full
      // investigation: on Android, KeyboardAvoidingView unconditionally
      // triggers LayoutAnimation on every keyboard show/hide event
      // regardless of `behavior`, which can knock a focused TextInput out
      // of focus and cause a show/hide loop. enabled={false} on Android
      // doesn't change this component's rendered output there at all, so
      // this is safe everywhere it's used.
      enabled={Platform.OS === 'ios'}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.container, { paddingBottom: keyboardHeight }]}
      >
        <RoleBadge style={styles.roleBadge} />
        <View style={styles.headerRow}>
          <Avatar name={fullName} url={avatarPath} size={36} />
          <Text style={styles.title}>{t('homeTitle')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loadingIndicator} />
        ) : (
          <View style={styles.journeySection}>
            {journey?.status === 'alert_triggered' && (
              <View style={styles.overdueBanner}>
                <Text style={styles.overdueBannerText}>{t('journeyAlertTriggeredBanner')}</Text>
              </View>
            )}

            {journey?.status === 'active' ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('journeyActiveLabel')}</Text>
                {journey.destination_note && (
                  <Text style={styles.cardSubtitle}>
                    {t('journeyDestinationLabel', { note: journey.destination_note })}
                  </Text>
                )}
                <Text style={styles.cardSubtitle}>
                  {minutesUntil >= 0
                    ? t('journeyTimeRemaining', { n: minutesUntil })
                    : t('journeyOverdueByMinutes', { n: Math.abs(minutesUntil) })}
                </Text>

                {actionError && <Text style={styles.error}>{actionError}</Text>}

                <Pressable
                  style={[styles.button, actionPending && styles.buttonDisabled]}
                  onPress={handleArrivedSafely}
                  disabled={actionPending}
                >
                  <Text style={styles.buttonText}>{t('arrivedSafelyButton')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.buttonSecondary, actionPending && styles.buttonDisabled]}
                  onPress={handleAddTime}
                  disabled={actionPending}
                >
                  <Text style={styles.buttonSecondaryText}>{t('addFifteenMinutesButton')}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('startJourneyTitle')}</Text>
                <Text style={styles.cardSubtitle}>{t('startJourneySubtitle')}</Text>

                <Text style={styles.fieldLabel}>{t('journeyDurationLabel')}</Text>
                <View style={styles.durationRow}>
                  {DURATION_OPTIONS_MINUTES.map((minutes) => (
                    <Pressable
                      key={minutes}
                      style={[
                        styles.durationOption,
                        selectedDuration === minutes && styles.durationOptionActive,
                      ]}
                      onPress={() => setSelectedDuration(minutes)}
                    >
                      <Text
                        style={[
                          styles.durationOptionText,
                          selectedDuration === minutes && styles.durationOptionTextActive,
                        ]}
                      >
                        {t('journeyDurationMinutesOption', { n: minutes })}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  ref={destinationNoteInputRef}
                  style={styles.input}
                  placeholder={t('destinationNotePlaceholder')}
                  value={destinationNote}
                  onChangeText={setDestinationNote}
                  onFocus={() =>
                    scrollInputIntoView(scrollViewRef.current, destinationNoteInputRef)
                  }
                />

                {createError && <Text style={styles.error}>{createError}</Text>}

                <Pressable
                  style={[styles.button, starting && styles.buttonDisabled]}
                  onPress={handleStart}
                  disabled={starting}
                >
                  {starting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{t('startJourneyButton')}</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Live location sharing — consent-based, always visible while on.
            The DB session (via useLiveSharing) is the source of truth, so
            this reflects reality after an app kill/reopen or a stop from
            another device, not just this screen's local state. */}
        <View style={styles.liveSharingCard}>
          <View style={styles.liveSharingHeader}>
            <View style={styles.liveSharingHeaderText}>
              <Text style={styles.cardTitle}>{t('liveSharingTitle')}</Text>
              <Text style={styles.cardSubtitle}>{t('liveSharingSubtitle')}</Text>
            </View>
            {liveSharing.busy ? (
              <ActivityIndicator />
            ) : (
              <Switch
                value={liveSharing.isSharing}
                onValueChange={handleLiveSharingToggle}
                disabled={liveSharing.loading}
              />
            )}
          </View>

          {liveSharing.isSharing && (
            <View style={styles.liveSharingOnBanner}>
              <Text style={styles.liveSharingOnBannerText}>{t('liveSharingOnStatus')}</Text>
            </View>
          )}

          {liveSharing.isSharing && liveSharing.mode === 'foreground' && (
            <Pressable style={styles.liveSharingWarnBanner} onPress={() => Linking.openSettings()}>
              <Text style={styles.liveSharingWarnBannerText}>
                {t('liveSharingForegroundWarning')}
              </Text>
            </Pressable>
          )}

          {liveSharing.error === 'permission-denied' && (
            <View style={styles.liveSharingWarnBanner}>
              <Text style={styles.liveSharingWarnBannerText}>
                {t('liveSharingPermissionDenied')}
              </Text>
              <Pressable onPress={() => Linking.openSettings()}>
                <Text style={styles.liveSharingSettingsLink}>{t('openSettings')}</Text>
              </Pressable>
            </View>
          )}

          {liveSharing.error === 'already-sharing-elsewhere' && (
            <View style={styles.liveSharingWarnBanner}>
              <Text style={styles.liveSharingWarnBannerText}>
                {t('liveSharingAlreadyElsewhere')}
              </Text>
            </View>
          )}

          {liveSharing.error === 'start-failed' && (
            <Text style={styles.error}>{t('liveSharingStartError')}</Text>
          )}
          {liveSharing.error === 'stop-failed' && (
            <Text style={styles.error}>{t('liveSharingStopError')}</Text>
          )}
        </View>

        <View style={styles.nearbySection}>
          <Pressable style={styles.nearbyButton} onPress={() => openNearbySearch('police station')}>
            <Text style={styles.nearbyButtonText}>{t('nearestPoliceButton')}</Text>
          </Pressable>
          <Pressable style={styles.nearbyButton} onPress={() => openNearbySearch('hospital')}>
            <Text style={styles.nearbyButtonText}>{t('nearestHospitalButton')}</Text>
          </Pressable>
          {/* Entirely absent from the tree when off, not just disabled —
            per Settings, someone who doesn't want this feature shouldn't
            even see the button. */}
          {settingsLoaded && fakeCallEnabled && (
            <Pressable style={styles.nearbyButton} onPress={() => setShowDelayPicker(true)}>
              <Text style={styles.nearbyButtonText}>{t('fakeCallButton')}</Text>
            </Pressable>
          )}
        </View>

        {/* Delay picker — a small modal, not a full-screen overlay; the
          full-screen treatment is reserved for the ringing/in-call states
          below, which need to look convincing. */}
        <Modal
          visible={showDelayPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDelayPicker(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowDelayPicker(false)}>
            <View style={styles.delayPickerCard}>
              <Text style={styles.delayPickerTitle}>{t('fakeCallDelayPickerTitle')}</Text>
              {FAKE_CALL_DELAY_OPTIONS_SECONDS.map((seconds) => (
                <Pressable
                  key={seconds}
                  style={styles.delayOption}
                  onPress={() => handleFakeCallDelaySelected(seconds)}
                >
                  <Text style={styles.delayOptionText}>
                    {seconds === 0
                      ? t('fakeCallDelayNow')
                      : t('fakeCallDelaySeconds', { n: seconds })}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        {/* Fake incoming call — full-screen, mimics a real call screen. */}
        <Modal visible={fakeCallState === 'ringing'} animationType="fade">
          <View style={styles.fakeCallScreen}>
            <Text style={styles.fakeCallStatusLabel}>{t('fakeCallIncomingLabel')}</Text>
            <Text style={styles.fakeCallerName}>
              {fakeCallCallerName || t('fakeCallDefaultCallerName')}
            </Text>
            <View style={styles.fakeCallActionsRow}>
              <Pressable
                style={[styles.fakeCallActionButton, styles.fakeCallDeclineButton]}
                onPress={handleDeclineFakeCall}
              >
                <Text style={styles.fakeCallActionButtonText}>{t('fakeCallDeclineButton')}</Text>
              </Pressable>
              <Pressable
                style={[styles.fakeCallActionButton, styles.fakeCallAcceptButton]}
                onPress={handleAcceptFakeCall}
              >
                <Text style={styles.fakeCallActionButtonText}>{t('fakeCallAcceptButton')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Fake in-call screen. */}
        <Modal visible={fakeCallState === 'in_call'} animationType="fade">
          <View style={styles.fakeCallScreen}>
            <Text style={styles.fakeCallStatusLabel}>{t('fakeCallInCallLabel')}</Text>
            <Text style={styles.fakeCallerName}>
              {fakeCallCallerName || t('fakeCallDefaultCallerName')}
            </Text>
            <Text style={styles.fakeCallTimer}>{formatCallDuration(callElapsedSeconds)}</Text>
            <Pressable
              style={[
                styles.fakeCallActionButton,
                styles.fakeCallDeclineButton,
                styles.fakeCallEndButtonWrap,
              ]}
              onPress={handleEndFakeCall}
            >
              <Text style={styles.fakeCallActionButtonText}>{t('fakeCallEndButton')}</Text>
            </Pressable>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function formatCallDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  roleBadge: {
    alignSelf: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    marginTop: 12,
  },
  journeySection: {
    gap: 12,
  },
  overdueBanner: {
    backgroundColor: '#fdecea',
    borderRadius: 10,
    padding: 12,
  },
  overdueBannerText: {
    color: '#a32a1f',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  liveSharingCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  liveSharingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveSharingHeaderText: {
    flex: 1,
    gap: 4,
  },
  liveSharingOnBanner: {
    backgroundColor: '#e6f4ea',
    borderRadius: 10,
    padding: 12,
  },
  liveSharingOnBannerText: {
    color: '#1a7f37',
    fontSize: 13,
    fontWeight: '600',
  },
  liveSharingWarnBanner: {
    backgroundColor: '#fff4e5',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  liveSharingWarnBannerText: {
    color: '#7a4a00',
    fontSize: 13,
  },
  liveSharingSettingsLink: {
    color: '#2f95dc',
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginTop: 4,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  durationOptionActive: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  durationOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  durationOptionTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  error: {
    color: '#d33',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#2f95dc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#2f95dc',
    fontSize: 15,
    fontWeight: '600',
  },
  nearbySection: {
    gap: 8,
  },
  nearbyButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  nearbyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  delayPickerCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    gap: 10,
  },
  delayPickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  delayOption: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  delayOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  fakeCallScreen: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  fakeCallStatusLabel: {
    color: '#aaa',
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fakeCallerName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  fakeCallTimer: {
    color: '#ccc',
    fontSize: 18,
    marginTop: 4,
  },
  fakeCallActionsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 48,
  },
  fakeCallActionButton: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 130,
    alignItems: 'center',
  },
  fakeCallAcceptButton: {
    backgroundColor: '#1a7f37',
  },
  fakeCallDeclineButton: {
    backgroundColor: '#d33',
  },
  fakeCallEndButtonWrap: {
    marginTop: 48,
  },
  fakeCallActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
