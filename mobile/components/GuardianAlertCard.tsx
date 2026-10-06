import { Linking, View } from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Text from '@/components/ui/Text';
import { EMERGENCY_NUMBER } from '@/constants/Emergency';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/theme';

const ICONS = {
  location: { ios: 'location.fill', android: 'near_me', web: 'near_me' },
  phone: { ios: 'phone.fill', android: 'call', web: 'call' },
} as const;

export type GuardianAlert = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  last_lat: number | null;
  last_lng: number | null;
  trigger_type: string;
};

export type GuardianAlertCardProps = {
  alert: GuardianAlert;
  // Already formatted, e.g. "2m ago"; the screen owns the clock.
  timeAgo: string;
  resolving: boolean;
  onResolve: () => void;
};

// One active alert on the guardian's Home: a red header saying who needs
// help, then the actions. Presentational only; the screen owns the alarm,
// the Realtime subscription and resolving.
export default function GuardianAlertCard({
  alert,
  timeAgo,
  resolving,
  onResolve,
}: GuardianAlertCardProps) {
  const { t } = useLanguage();
  const { colors, radius, spacing } = useTheme();
  const missedCheckin = alert.trigger_type === 'journey_overdue';
  const hasLocation = alert.last_lat != null && alert.last_lng != null;

  return (
    <View
      style={{
        borderRadius: radius.xl,
        borderWidth: 1.5,
        borderColor: colors.dangerBorder,
        backgroundColor: colors.surface,
        overflow: 'hidden',
      }}
    >
      <View style={{ backgroundColor: colors.danger, padding: spacing.lg, gap: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.md,
            borderRadius: radius.pill,
            backgroundColor: colors.dangerPressed,
          }}
        >
          <View
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onDanger }}
          />
          <Text variant="label" color="onDanger">
            {`${missedCheckin ? t('missedCheckinTypeLabel') : t('sosAlertTypeLabel')} · ${timeAgo}`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar name={alert.full_name} url={alert.avatar_url} size={48} />
          <Text variant="h2" color="onDanger" style={{ flex: 1 }} accessibilityRole="header">
            {missedCheckin
              ? t('guardianAlertMissedCheckin', { name: alert.full_name })
              : t('guardianAlertNeedsHelp', { name: alert.full_name })}
          </Text>
        </View>
        {!hasLocation && (
          <Text variant="bodySm" color="onDanger">
            {t('noLocationAvailableYet')}
          </Text>
        )}
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {hasLocation && (
          <Button
            variant="ink"
            icon={ICONS.location}
            title={t('viewLastKnownLocationLink')}
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps?q=${alert.last_lat},${alert.last_lng}`)
            }
          />
        )}
        <Button
          variant="secondary"
          title={t('markResolvedButton')}
          onPress={onResolve}
          loading={resolving}
        />
        <Button
          variant="dangerOutline"
          icon={ICONS.phone}
          title={t('callEmergencyNumber', { number: EMERGENCY_NUMBER })}
          onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
        />
      </View>
    </View>
  );
}
