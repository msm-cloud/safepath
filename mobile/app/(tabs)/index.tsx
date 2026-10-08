import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, type ScrollView, type TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeHeader from '@/components/HomeHeader';
import JourneyCard from '@/components/JourneyCard';
import LocationToggleCard, { type LocationToggleNotice } from '@/components/LocationToggleCard';
import OnboardingScreen from '@/components/OnboardingScreen';
import SosShortcut from '@/components/SosShortcut';
import ActionTile from '@/components/ui/ActionTile';
import PhoneNotSavedNotice from '@/components/ui/PhoneNotSavedNotice';
import Screen from '@/components/ui/Screen';
import SettingsLoadNotice from '@/components/ui/SettingsLoadNotice';
import Text from '@/components/ui/Text';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { getBestEffortLocation } from '@/lib/location';
import { isOnline } from '@/lib/network';
import { cancelScheduledNotification, scheduleArrivalCheckNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useAcceptedGuardians } from '@/lib/use-accepted-guardians';
import { useInputScroll } from '@/lib/use-input-scroll';
import { useLiveSharing } from '@/lib/use-live-sharing';
import { useLocationHistory } from '@/lib/use-location-history';
import { usePendingOnboarding } from '@/lib/use-pending-onboarding';
import { useUserSettings } from '@/lib/user-settings-context';
import { useTheme } from '@/theme';

const DURATION_OPTIONS_MINUTES = [15, 30, 45, 60];
const EXTEND_MINUTES = 15;

const ICONS = {
  police: { ios: 'shield.lefthalf.filled', android: 'local_police', web: 'local_police' },
  hospital: { ios: 'cross.case.fill', android: 'local_hospital', web: 'local_hospital' },
  fakeCall: { ios: 'phone.fill', android: 'call', web: 'call' },
  liveSharing: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
  locationHistory: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
} as const;

type JourneyStatus = 'active' | 'arrived_safe' | 'alert_triggered' | 'cancelled';

type Journey = {
  id: string;
  destination_note: string | null;
  expected_arrival_at: string;
  grace_period_minutes: number;
  status: JourneyStatus;
};

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useLanguage();
  const { colors, spacing } = useTheme();
  const { displayReady: settingsReady, fakeCallEnabled, fullName, avatarPath } = useUserSettings();
  const userId = session?.user.id;
  const {
    checking: checkingOnboarding,
    show: showOnboarding,
    dismiss: dismissOnboarding,
  } = usePendingOnboarding(userId);

  const liveSharing = useLiveSharing();
  const locationHistory = useLocationHistory();
  const { guardians, loaded: guardiansLoaded } = useAcceptedGuardians(userId);

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
  // null until the first check, so the status line never flashes "offline".
  const [online, setOnline] = useState<boolean | null>(null);

  const [selectedDuration, setSelectedDuration] = useState(30);
  const [destinationNote, setDestinationNote] = useState('');
  const [starting, setStarting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const destinationNoteInputRef = useRef<TextInput>(null);
  // Screen pads the top edge for the status bar here, so the scroll view
  // starts below it.
  const safeAreaTop = useSafeAreaInsets().top;
  const { onInputFocus, onInputBlur } = useInputScroll(scrollViewRef, safeAreaTop);

  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // In-memory only — covers the common case (marking arrived / adding time
  // in the same app session that started the journey). If the app was
  // killed and reopened, this is lost and the locally-scheduled reminder
  // can't be cancelled early; it's just a slightly-stale reminder in that
  // case, not a safety gap, since the real mechanism is the server-side
  // cron job, which doesn't depend on this at all.
  const [notificationId, setNotificationId] = useState<string | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void isOnline().then((result) => {
        if (!cancelled) setOnline(result);
      });
      return () => {
        cancelled = true;
      };
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

  const handleLocationHistoryToggle = (next: boolean) => {
    if (locationHistory.busy || locationHistory.loading) return;
    if (next) {
      locationHistory.start();
    } else {
      locationHistory.stop();
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

  const liveSharingWarnings: LocationToggleNotice[] = [];
  if (liveSharing.isSharing && liveSharing.mode === 'foreground') {
    liveSharingWarnings.push({ message: t('liveSharingForegroundWarning'), openSettings: true });
  }
  if (liveSharing.error === 'permission-denied') {
    liveSharingWarnings.push({ message: t('liveSharingPermissionDenied'), openSettings: true });
  }
  if (liveSharing.error === 'already-sharing-elsewhere') {
    liveSharingWarnings.push({ message: t('liveSharingAlreadyElsewhere') });
  }
  const liveSharingError =
    liveSharing.error === 'start-failed'
      ? t('liveSharingStartError')
      : liveSharing.error === 'stop-failed'
        ? t('liveSharingStopError')
        : null;

  const locationHistoryWarnings: LocationToggleNotice[] = [];
  if (locationHistory.enabled && locationHistory.mode === 'foreground') {
    locationHistoryWarnings.push({
      message: t('locationHistoryForegroundWarning'),
      openSettings: true,
    });
  }
  if (locationHistory.error === 'permission-denied') {
    locationHistoryWarnings.push({
      message: t('locationHistoryPermissionDenied'),
      openSettings: true,
    });
  }
  const locationHistoryError =
    locationHistory.error === 'start-failed'
      ? t('locationHistoryStartError')
      : locationHistory.error === 'stop-failed'
        ? t('locationHistoryStopError')
        : locationHistory.error === 'save-failed'
          ? t('locationHistorySaveError')
          : null;

  return (
    <Screen edges={['top']} scrollRef={scrollViewRef} contentStyle={{ gap: spacing.lg }}>
      <HomeHeader
        fullName={fullName}
        avatarPath={avatarPath}
        now={now}
        guardians={guardians}
        guardiansLoaded={guardiansLoaded}
        onGuardiansPress={() => router.navigate('/contacts')}
      />
      <PhoneNotSavedNotice />
      <SettingsLoadNotice />

      <View style={{ alignItems: 'center', gap: spacing.sm + 2, paddingVertical: spacing.xs }}>
        <SosShortcut onPress={() => router.navigate('/sos')} />
        {online !== null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: online ? colors.info : colors.textMuted,
              }}
            />
            <Text variant="caption" color="textSecondary">
              {online ? t('homeStatusOnline') : t('homeStatusOffline')}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <JourneyCard
          journey={
            journey ? { destinationNote: journey.destination_note, status: journey.status } : null
          }
          minutesUntil={minutesUntil}
          durationOptions={DURATION_OPTIONS_MINUTES}
          selectedDuration={selectedDuration}
          onSelectDuration={setSelectedDuration}
          destinationNote={destinationNote}
          onChangeDestinationNote={setDestinationNote}
          destinationNoteRef={destinationNoteInputRef}
          onDestinationNoteFocus={() => onInputFocus(destinationNoteInputRef)}
          onDestinationNoteBlur={() => onInputBlur(destinationNoteInputRef)}
          starting={starting}
          createError={createError}
          onStart={handleStart}
          actionPending={actionPending}
          actionError={actionError}
          onArrivedSafely={handleArrivedSafely}
          onAddTime={handleAddTime}
        />
      )}

      <View style={{ gap: spacing.sm + 2 }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm + 2 }}>
          <ActionTile
            icon={ICONS.police}
            label={t('nearestPoliceButton')}
            onPress={() => openNearbySearch('police station')}
          />
          <ActionTile
            icon={ICONS.hospital}
            label={t('nearestHospitalButton')}
            onPress={() => openNearbySearch('hospital')}
          />
        </View>
        {/* Entirely absent from the tree when off, not just disabled —
            per Settings, someone who doesn't want this feature shouldn't
            even see the button. */}
        {settingsReady && fakeCallEnabled && (
          <View style={{ flexDirection: 'row', gap: spacing.sm + 2 }}>
            <ActionTile
              icon={ICONS.fakeCall}
              label={t('fakeCallButton')}
              onPress={() => router.push('/fake-call')}
            />
            <View style={{ flex: 1 }} />
          </View>
        )}
      </View>

      {/* Live location sharing — consent-based, always visible while on.
          The DB session (via useLiveSharing) is the source of truth, so
          this reflects reality after an app kill/reopen or a stop from
          another device, not just this screen's local state. */}
      <LocationToggleCard
        title={t('liveSharingTitle')}
        hint={t('liveSharingSubtitle')}
        icon={ICONS.liveSharing}
        value={liveSharing.isSharing}
        busy={liveSharing.busy}
        loading={liveSharing.loading}
        onValueChange={handleLiveSharingToggle}
        onStatus={t('liveSharingOnStatus')}
        warnings={liveSharingWarnings}
        error={liveSharingError}
      />

      {/* Location history recording — independent of live sharing above.
          The DB flag (via useLocationHistory) is the source of truth, and
          an Android foreground-service notification runs the whole time
          it's on, so this is never covert. */}
      <LocationToggleCard
        title={t('locationHistoryTitle')}
        hint={t('locationHistorySubtitle')}
        icon={ICONS.locationHistory}
        value={locationHistory.enabled}
        busy={locationHistory.busy}
        loading={locationHistory.loading}
        onValueChange={handleLocationHistoryToggle}
        onStatus={t('locationHistoryOnStatus')}
        warnings={locationHistoryWarnings}
        error={locationHistoryError}
      />
    </Screen>
  );
}
