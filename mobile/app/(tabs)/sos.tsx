import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { getBestEffortLocation } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import { useLocationPermission } from '@/lib/use-location-permission';

const HOLD_DURATION_MS = 2000;
const LOCATION_INTERVAL_MS = 15000;

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

  const [phase, setPhase] = useState<Phase>('idle');
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

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

  const triggerSos = useCallback(async () => {
    if (!userId) return;
    setErrorMessage(null);
    setPhase('creating');

    const location = await getBestEffortLocation();

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        user_id: userId,
        status: 'active',
        trigger_type: 'manual',
        last_lat: location?.lat ?? null,
        last_lng: location?.lng ?? null,
      })
      .select('id, created_at')
      .single();

    if (error || !data) {
      setPhase('idle');
      setErrorMessage(error?.message ?? t('sosCreateError'));
      return;
    }

    setActiveAlert({ id: data.id, createdAt: data.created_at });
    setPhase('active');
  }, [userId, t]);

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

  if (phase === 'active' && activeAlert) {
    return (
      <View style={styles.container}>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>{t('alertActiveLabel')}</Text>
        </View>
        <Text style={styles.subtitle}>
          {t('alertActiveSubtitle', {
            time: new Date(activeAlert.createdAt).toLocaleTimeString(),
          })}
        </Text>

        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <Pressable
          style={[styles.safeButton, resolving && styles.buttonDisabled]}
          onPress={handleResolve}
          disabled={resolving}
        >
          {resolving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.safeButtonText}>{t('imSafeNow')}</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('sosTitle')}</Text>
      <Text style={styles.subtitle}>{t('sosSubtitle')}</Text>

      {locationPermission === 'denied' && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionBannerText}>{t('locationDeniedBanner')}</Text>
          <Pressable onPress={() => Linking.openSettings()}>
            <Text style={styles.permissionBannerLink}>{t('openSettings')}</Text>
          </Pressable>
        </View>
      )}

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      {phase === 'creating' ? (
        <View style={styles.sosButtonOuter}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : (
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.sosButtonOuter}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.sosButtonFill, { height: fillHeight }]}
          />
          <View style={styles.sosButtonLabelWrap} pointerEvents="none">
            <Text style={styles.sosButtonLabel}>{t('holdForSosLabel')}</Text>
          </View>
        </Pressable>
      )}

      <Text style={styles.holdHint}>{t('holdHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  error: {
    color: '#d33',
    fontSize: 14,
    textAlign: 'center',
  },
  permissionBanner: {
    backgroundColor: '#fff4e5',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    width: '100%',
  },
  permissionBannerText: {
    fontSize: 13,
    color: '#7a4a00',
  },
  permissionBannerLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2f95dc',
  },
  sosButtonOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#7a1212',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  sosButtonFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ff3b30',
  },
  sosButtonLabelWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButtonLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  holdHint: {
    fontSize: 12,
    color: '#888',
  },
  activeBadge: {
    backgroundColor: '#d33',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  safeButton: {
    backgroundColor: '#1a7f37',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  safeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
