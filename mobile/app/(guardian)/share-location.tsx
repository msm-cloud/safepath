import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { useLanguage } from '@/lib/language-context';
import { useLocationHistory } from '@/lib/use-location-history';

// Guardian counterpart to the student Home tab's "Location History
// Recording" card (app/(tabs)/index.tsx) — same underlying toggle
// (useLocationHistory, profiles.location_history_enabled,
// location_history_points), just its own screen instead of a Home-screen
// card, since the guardian tab group has no equivalent Home card to put
// it on. Reachable from Settings (see components/SettingsScreen.tsx),
// href: null in app/(guardian)/_layout.tsx like the other settings
// sub-screens.
//
// Who can read these points back is entirely an RLS/query concern (see
// location_history_points_select_user_reads_guardian_in_window +
// location_history_retention.recorded_by_role = 'guardian') — this
// screen and the hook it uses don't need to know or care that the writer
// is a guardian rather than a student.
export default function ShareLocationScreen() {
  const { t } = useLanguage();
  const locationHistory = useLocationHistory();

  const handleToggle = (next: boolean) => {
    if (locationHistory.busy || locationHistory.loading) return;
    if (next) {
      locationHistory.start();
    } else {
      locationHistory.stop();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('guardianShareLocationTitle')}</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardSubtitle}>{t('guardianShareLocationSubtitle')}</Text>
          {locationHistory.busy ? (
            <ActivityIndicator />
          ) : (
            <Switch
              value={locationHistory.enabled}
              onValueChange={handleToggle}
              disabled={locationHistory.loading}
            />
          )}
        </View>

        {locationHistory.enabled && (
          <View style={styles.onBanner}>
            <Text style={styles.onBannerText}>{t('guardianShareLocationOnStatus')}</Text>
          </View>
        )}

        {locationHistory.enabled && locationHistory.mode === 'foreground' && (
          <Pressable style={styles.warnBanner} onPress={() => Linking.openSettings()}>
            <Text style={styles.warnBannerText}>{t('guardianShareLocationForegroundWarning')}</Text>
          </Pressable>
        )}

        {locationHistory.error === 'permission-denied' && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnBannerText}>{t('guardianShareLocationPermissionDenied')}</Text>
            <Pressable onPress={() => Linking.openSettings()}>
              <Text style={styles.settingsLink}>{t('openSettings')}</Text>
            </Pressable>
          </View>
        )}

        {locationHistory.error === 'start-failed' && (
          <Text style={styles.error}>{t('guardianShareLocationStartError')}</Text>
        )}
        {locationHistory.error === 'stop-failed' && (
          <Text style={styles.error}>{t('guardianShareLocationStopError')}</Text>
        )}
        {locationHistory.error === 'save-failed' && (
          <Text style={styles.error}>{t('guardianShareLocationSaveError')}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 32,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardSubtitle: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  onBanner: {
    backgroundColor: '#e6f4ea',
    borderRadius: 10,
    padding: 12,
  },
  onBannerText: {
    color: '#1a7f37',
    fontSize: 13,
    fontWeight: '600',
  },
  warnBanner: {
    backgroundColor: '#fff4e5',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  warnBannerText: {
    color: '#7a4a00',
    fontSize: 13,
  },
  settingsLink: {
    color: '#2f95dc',
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: '#d33',
    fontSize: 13,
  },
});
