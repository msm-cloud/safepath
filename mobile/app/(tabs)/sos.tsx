import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { EMERGENCY_NUMBER } from '@/constants/Emergency';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { getBestEffortLocation } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import { loadSosContacts } from '@/lib/sos-contacts';
import { triggerSos as triggerSosShared, type EmergencyContact } from '@/lib/sos-trigger';
import { useLocationPermission } from '@/lib/use-location-permission';
import { useTheme } from '@/theme';

const HOLD_DURATION_MS = 2000;
const LOCATION_INTERVAL_MS = 15000;

const PHONE_ICON = { ios: 'phone.fill', android: 'call', web: 'call' } as const;

// Hold button: two soft rings around the button, as on the Home SOS board.
const HOLD_OUTER_RING = 272;
const HOLD_INNER_RING = 232;
const HOLD_BUTTON = 192;
const HOLD_BUTTON_BORDER = 6;

// Decorative rings behind the SOS active heading, from the SOS active board.
const ACTIVE_RINGS = [220, 340, 470];
const ACTIVE_RINGS_CENTER_Y = 230;

type Phase = 'idle' | 'creating' | 'active';

type ActiveAlert = {
  id: string;
  createdAt: string;
};

export default function SosScreen() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const userId = session?.user.id;
  const locationPermission = useLocationPermission();

  const router = useRouter();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { colors, radius, sizes, spacing } = useTheme();

  const [phase, setPhase] = useState<Phase>('idle');
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  // Set only when the SOS itself couldn't go out by any route, so a call is
  // the one remaining option; never for errors like a failed resolve.
  const [offerEmergencyCall, setOfferEmergencyCall] = useState(false);

  // Cached proactively (not fetched lazily at trigger-time) so the offline
  // SMS fallback below has this data available WITHOUT needing a fresh
  // network call at the moment it's actually needed — by definition, if
  // we've reached the offline path, a fresh Supabase fetch wouldn't work.
  // null means "not loaded yet"; distinguishes from a genuine empty list.
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[] | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Re-syncs from the server every time this tab gains focus (including
  // first mount): covers the app being reopened mid-alert, and a guardian
  // resolving the alert remotely while this tab wasn't the one open.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;

      supabase
        .from('alerts')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          if (data) {
            setActiveAlert({ id: data.id, createdAt: data.created_at });
            setPhase('active');
          } else {
            setActiveAlert(null);
            // Only force back to idle if we were showing an active alert —
            // never stomp on a 'creating' in flight from a hold that just
            // completed.
            setPhase((prev) => (prev === 'active' ? 'idle' : prev));
          }
        });

      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  // The 15s location-ping interval — only runs while this tab is focused
  // AND there's a known active alert. Each tick also re-checks the alert's
  // status first: if a guardian resolved it since our last tick, this is
  // where the mobile app "notices" (polling, not realtime, on this side)
  // and stops itself.
  useFocusEffect(
    useCallback(() => {
      if (phase !== 'active' || !activeAlert) return;
      const alertId = activeAlert.id;

      const intervalId = setInterval(async () => {
        const { data: current, error: statusError } = await supabase
          .from('alerts')
          .select('status')
          .eq('id', alertId)
          .single();

        if (statusError || !current || current.status !== 'active') {
          setPhase('idle');
          setActiveAlert(null);
          return;
        }

        const location = await getBestEffortLocation();
        if (!location) return; // skip this tick's write, try again next tick

        await supabase.from('alert_locations').insert({
          alert_id: alertId,
          lat: location.lat,
          lng: location.lng,
        });
        await supabase
          .from('alerts')
          .update({ last_lat: location.lat, last_lng: location.lng })
          .eq('id', alertId);
      }, LOCATION_INTERVAL_MS);

      return () => clearInterval(intervalId);
    }, [phase, activeAlert])
  );

  // Refreshes emergency contacts + display name on every focus. Offline (or
  // on a failed fetch) this falls back to the on-device copy from the last
  // successful load, so the SMS fallback still works after a cold start
  // without network.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;

      loadSosContacts(userId).then(({ contacts, fullName: name }) => {
        if (cancelled) return;
        setEmergencyContacts(contacts);
        setFullName(name);
      });

      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  // The actual online/offline branching, insert, and SMS-fallback logic
  // now lives in lib/sos-trigger.ts — shared verbatim with the
  // shake-to-trigger listener (components/ShakeSosListener.tsx) so shake
  // calls into the exact same function rather than a second copy of it.
  // This wrapper's job is purely translating that shared function's
  // result into this screen's own phase/activeAlert/errorMessage display
  // state — every field, branch, and message the insert/SMS logic used is
  // unchanged from before this extraction.
  const triggerSos = useCallback(async () => {
    if (!userId) return;
    setErrorMessage(null);
    setOfferEmergencyCall(false);
    setPhase('creating');

    const result = await triggerSosShared({ userId, emergencyContacts, fullName, t });

    if (result.mode === 'created') {
      setActiveAlert(result.alert);
      setPhase('active');
    } else if (result.mode === 'offline_sms_sent') {
      setPhase('idle');
    } else {
      setPhase('idle');
      setErrorMessage(result.message);
      setOfferEmergencyCall(true);
    }
  }, [userId, emergencyContacts, fullName, t]);

  const handlePressIn = () => {
    if (phase !== 'idle') return;
    holdProgress.setValue(0);
    holdAnimation.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      useNativeDriver: false,
    });
    holdAnimation.current.start(({ finished }) => {
      if (finished) {
        triggerSos();
      }
    });
  };

  const handlePressOut = () => {
    if (phase !== 'idle') return;
    holdAnimation.current?.stop();
    Animated.timing(holdProgress, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const handleResolve = async () => {
    if (!activeAlert) return;
    setResolving(true);
    const { error } = await supabase
      .from('alerts')
      .update({ status: 'resolved' })
      .eq('id', activeAlert.id);
    setResolving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPhase('idle');
    setActiveAlert(null);
  };

  // react-hooks/refs (the React Compiler-era strict rule) flags any
  // `.current` read during render, including this one — but deriving an
  // interpolation from a ref-held Animated.Value during render is the
  // standard, safe React Native pattern (it's how RN's own Animated API
  // docs teach this): the interpolation is a static derived object, and
  // Animated.Value updates happen outside React's render cycle entirely,
  // so this doesn't have the staleness problem the rule exists to catch.
  // eslint-disable-next-line react-hooks/refs
  const fillHeight = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isActive = phase === 'active' && activeAlert !== null;

  // The active screen is a full red page, so the tab header steps aside.
  useEffect(() => {
    navigation.setOptions({ headerShown: !isActive });
  }, [navigation, isActive]);

  // Display-only clock for the elapsed time in the status pill.
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- captures wall-clock time into state (render must stay pure), same pattern as the guardian home's relative times.
    setNow(Date.now());
    const tickId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickId);
  }, [isActive]);

  const callEmergencyNumber = () => Linking.openURL(`tel:${EMERGENCY_NUMBER}`);
  const callEmergencyTitle = t('callEmergencyNumber', { number: EMERGENCY_NUMBER });

  if (isActive && activeAlert) {
    const elapsedMs = now ? now - new Date(activeAlert.createdAt).getTime() : 0;

    return (
      <View style={{ flex: 1, backgroundColor: colors.danger }}>
        {isFocused && <StatusBar style="light" />}
        {ACTIVE_RINGS.map((size) => (
          <View
            key={size}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 2,
              borderColor: colors.onDangerFaint,
              left: '50%',
              marginLeft: -size / 2,
              top: ACTIVE_RINGS_CENTER_Y - size / 2,
            }}
          />
        ))}
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: sizes.screenGutter,
              paddingTop: spacing.lg,
              paddingBottom: spacing.xl,
              gap: spacing.xl,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  backgroundColor: colors.dangerPressed,
                }}
              >
                <View
                  style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.onDanger }}
                />
                <Text variant="label" color="onDanger">
                  {t('sosActivePill', { elapsed: formatElapsed(elapsedMs) })}
                </Text>
              </View>
              {locationPermission === 'granted' && (
                <Text variant="caption" weight="semibold" color="onDanger">
                  {t('sosSharingLocation')}
                </Text>
              )}
            </View>

            <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
              <Text variant="display" color="onDanger" accessibilityRole="header">
                {t('sosActiveHeading')}
              </Text>
              <Text variant="body" color="onDanger">
                {t('alertActiveSubtitle', {
                  time: new Date(activeAlert.createdAt).toLocaleTimeString(),
                })}
              </Text>
            </View>

            {errorMessage && <Banner tone="danger" message={errorMessage} />}

            <View style={{ marginTop: 'auto', gap: spacing.md }}>
              <Button
                variant="emergencyCall"
                icon={PHONE_ICON}
                title={callEmergencyTitle}
                onPress={callEmergencyNumber}
              />
              <Button
                variant="onDangerOutline"
                title={t('imSafeNow')}
                onPress={handleResolve}
                loading={resolving}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const ring = (size: number) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  });

  return (
    <Screen edges={[]} contentStyle={{ alignItems: 'center', gap: spacing.lg }}>
      <Text variant="bodySm" color="textSecondary" align="center">
        {t('sosSubtitle')}
      </Text>

      {locationPermission === 'denied' && (
        <View style={{ alignSelf: 'stretch' }}>
          <Banner
            tone="warning"
            message={t('locationDeniedBanner')}
            action={{ label: t('openSettings'), onPress: () => Linking.openSettings() }}
          />
        </View>
      )}

      {errorMessage && (
        <View style={{ alignSelf: 'stretch' }}>
          <Banner tone="danger" message={errorMessage} />
        </View>
      )}

      {offerEmergencyCall && (
        <Button
          variant="danger"
          icon={PHONE_ICON}
          title={callEmergencyTitle}
          onPress={callEmergencyNumber}
        />
      )}

      <View
        style={[
          ring(HOLD_OUTER_RING),
          { marginTop: spacing.sm, backgroundColor: colors.dangerSoft },
        ]}
      >
        <View style={[ring(HOLD_INNER_RING), { backgroundColor: colors.dangerBorder }]}>
          {phase === 'creating' ? (
            <View
              style={[
                ring(HOLD_BUTTON),
                {
                  borderWidth: HOLD_BUTTON_BORDER,
                  borderColor: colors.surface,
                  backgroundColor: colors.dangerPressed,
                },
              ]}
            >
              <ActivityIndicator color={colors.onDanger} size="large" />
            </View>
          ) : (
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              accessibilityRole="button"
              accessibilityLabel={t('sosTitle')}
              accessibilityHint={t('holdHint')}
              style={[
                ring(HOLD_BUTTON),
                {
                  overflow: 'hidden',
                  borderWidth: HOLD_BUTTON_BORDER,
                  borderColor: colors.surface,
                  backgroundColor: colors.danger,
                },
              ]}
            >
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: fillHeight,
                  backgroundColor: colors.dangerPressed,
                }}
              />
              <View
                pointerEvents="none"
                style={{ alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.md }}
              >
                <Text variant="display" color="onDanger" script="latin">
                  SOS
                </Text>
                <Text variant="label" color="onDanger" align="center">
                  {t('sosHoldCaption')}
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <Text variant="caption" color="textMuted" align="center">
        {t('holdHint')}
      </Text>

      {emergencyContacts !== null && emergencyContacts.length === 0 && (
        <Pressable
          onPress={() => router.push('/emergency-contacts')}
          accessibilityRole="link"
          hitSlop={spacing.sm}
          style={{ minHeight: sizes.minTouch, justifyContent: 'center' }}
        >
          <Text variant="caption" color="textMuted" align="center">
            {t('noContactsNudgeText')}{' '}
            <Text variant="caption" weight="bold" color="primary">
              {t('addContactsLink')}
            </Text>
          </Text>
        </Pressable>
      )}
    </Screen>
  );
}

// mm:ss, or h:mm:ss once it passes an hour.
function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
