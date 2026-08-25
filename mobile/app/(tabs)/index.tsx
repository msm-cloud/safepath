import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { getBestEffortLocation } from '@/lib/location';
import { cancelScheduledNotification, scheduleArrivalCheckNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

const DURATION_OPTIONS_MINUTES = [15, 30, 45, 60];
const EXTEND_MINUTES = 15;

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
  const userId = session?.user.id;

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

  const minutesUntil = journey
    ? Math.round((new Date(journey.expected_arrival_at).getTime() - now) / 60000)
    : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('homeTitle')}</Text>

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
                style={styles.input}
                placeholder={t('destinationNotePlaceholder')}
                value={destinationNote}
                onChangeText={setDestinationNote}
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

      <View style={styles.nearbySection}>
        <Pressable style={styles.nearbyButton} onPress={() => openNearbySearch('police station')}>
          <Text style={styles.nearbyButtonText}>{t('nearestPoliceButton')}</Text>
        </Pressable>
        <Pressable style={styles.nearbyButton} onPress={() => openNearbySearch('hospital')}>
          <Text style={styles.nearbyButtonText}>{t('nearestHospitalButton')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
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
});
