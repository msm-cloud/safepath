import { Linking, View } from 'react-native';

import Banner from '@/components/ui/Banner';
import ListGroup from '@/components/ui/ListGroup';
import Screen from '@/components/ui/Screen';
import SwitchRow from '@/components/ui/SwitchRow';
import { useLanguage } from '@/lib/language-context';
import { useLocationHistory } from '@/lib/use-location-history';
import { useTheme } from '@/theme';

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
  const { spacing } = useTheme();
  const locationHistory = useLocationHistory();

  const handleToggle = (next: boolean) => {
    if (locationHistory.busy || locationHistory.loading) return;
    if (next) {
      locationHistory.start();
    } else {
      locationHistory.stop();
    }
  };

  const openSettings = { label: t('openSettings'), onPress: () => void Linking.openSettings() };

  return (
    <Screen edges={[]} contentStyle={{ gap: spacing.lg }}>
      <ListGroup>
        <SwitchRow
          title={t('guardianShareLocationTitle')}
          hint={t('guardianShareLocationSubtitle')}
          icon={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }}
          iconTone="primarySoft"
          value={locationHistory.enabled}
          onValueChange={handleToggle}
          disabled={locationHistory.loading}
          busy={locationHistory.busy}
        />
      </ListGroup>

      <View style={{ gap: spacing.md }}>
        {locationHistory.enabled && (
          <Banner tone="success" message={t('guardianShareLocationOnStatus')} />
        )}
        {locationHistory.enabled && locationHistory.mode === 'foreground' && (
          <Banner
            tone="warning"
            message={t('guardianShareLocationForegroundWarning')}
            action={openSettings}
          />
        )}
        {locationHistory.error === 'permission-denied' && (
          <Banner
            tone="warning"
            message={t('guardianShareLocationPermissionDenied')}
            action={openSettings}
          />
        )}
        {locationHistory.error === 'start-failed' && (
          <Banner tone="danger" message={t('guardianShareLocationStartError')} />
        )}
        {locationHistory.error === 'stop-failed' && (
          <Banner tone="danger" message={t('guardianShareLocationStopError')} />
        )}
        {locationHistory.error === 'save-failed' && (
          <Banner tone="danger" message={t('guardianShareLocationSaveError')} />
        )}
      </View>
    </Screen>
  );
}
