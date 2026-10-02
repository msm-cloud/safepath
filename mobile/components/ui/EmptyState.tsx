import type { SymbolViewProps } from 'expo-symbols';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import Button, { type ButtonVariant } from './Button';
import IconTile, { type IconTileTone } from './IconTile';
import Text from './Text';

export type EmptyStateProps = {
  icon: SymbolViewProps['name'];
  title: string;
  message?: string;
  tone?: IconTileTone;
  action?: { label: string; onPress: () => void; variant?: ButtonVariant };
};

const ICON_SIZE = 64;

// Shown in place of a list that has nothing in it yet. Centred in whatever
// space the parent gives it, so a screen can pass flex: 1 to fill the page.
export default function EmptyState({
  icon,
  title,
  message,
  tone = 'primarySoft',
  action,
}: EmptyStateProps) {
  const { spacing } = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.lg,
      }}
    >
      <IconTile icon={icon} tone={tone} size={ICON_SIZE} />
      <View style={{ gap: spacing.xs, alignItems: 'center' }}>
        <Text variant="title" align="center" accessibilityRole="header">
          {title}
        </Text>
        {message && (
          <Text variant="bodySm" color="textMuted" align="center">
            {message}
          </Text>
        )}
      </View>
      {action && (
        <View style={{ marginTop: spacing.sm }}>
          <Button
            title={action.label}
            variant={action.variant ?? 'secondary'}
            size="small"
            fullWidth={false}
            onPress={action.onPress}
          />
        </View>
      )}
    </View>
  );
}
