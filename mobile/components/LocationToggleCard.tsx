import type { SymbolViewProps } from 'expo-symbols';
import { Linking, View } from 'react-native';

import Banner from '@/components/ui/Banner';
import Card from '@/components/ui/Card';
import SwitchRow from '@/components/ui/SwitchRow';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/theme';

export type LocationToggleNotice = {
  message: string;
  // Shows an "Open Settings" link, for problems the person fixes there.
  openSettings?: boolean;
};

export type LocationToggleCardProps = {
  title: string;
  hint: string;
  icon: SymbolViewProps['name'];
  value: boolean;
  // A start/stop is in flight.
  busy: boolean;
  // The saved value isn't known yet.
  loading: boolean;
  onValueChange: (next: boolean) => void;
  // Shown the whole time the feature is on, so it is never covert.
  onStatus: string;
  warnings: LocationToggleNotice[];
  error: string | null;
};

// One on/off location feature (live sharing, location history) with its
// standing status and any warnings. Pure presentation: the caller's hook
// owns the state and the start/stop logic.
export default function LocationToggleCard({
  title,
  hint,
  icon,
  value,
  busy,
  loading,
  onValueChange,
  onStatus,
  warnings,
  error,
}: LocationToggleCardProps) {
  const { t } = useLanguage();
  const { spacing } = useTheme();
  const hasFooter = value || warnings.length > 0 || error != null;

  return (
    <Card padding="none">
      <SwitchRow
        title={title}
        hint={hint}
        icon={icon}
        iconTone="primarySoft"
        value={value}
        onValueChange={onValueChange}
        // Until the saved value is known the switch would read "off", so it
        // shows the same spinner as a start/stop in flight.
        busy={busy || loading}
      />
      {hasFooter && (
        <View style={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          {value && <Banner tone="success" message={onStatus} />}
          {warnings.map((warning) => (
            <Banner
              key={warning.message}
              tone="warning"
              message={warning.message}
              action={
                warning.openSettings
                  ? { label: t('openSettings'), onPress: () => Linking.openSettings() }
                  : undefined
              }
            />
          ))}
          {error && <Banner tone="danger" message={error} />}
        </View>
      )}
    </Card>
  );
}
