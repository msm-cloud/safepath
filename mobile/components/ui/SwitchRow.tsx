import type { SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

import { useTheme } from '@/theme';

import IconTile, { type IconTileTone } from './IconTile';
import Text from './Text';

export type SwitchRowProps = {
  title: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: SymbolViewProps['name'];
  iconTone?: IconTileTone;
  disabled?: boolean;
  // Shows a spinner in place of the switch while a change is being applied
  // (e.g. starting a location task); the row ignores presses meanwhile.
  busy?: boolean;
};

const ICON_SIZE = 40;

// A setting with an on/off toggle. The whole row is the touch target and
// the accessible switch; the native Switch inside is only the visual.
export default function SwitchRow({
  title,
  hint,
  value,
  onValueChange,
  icon,
  iconTone = 'neutral',
  disabled = false,
  busy = false,
}: SwitchRowProps) {
  const { colors, sizes, spacing } = useTheme();
  const inactive = disabled || busy;

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={inactive}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={hint}
      accessibilityState={{ checked: value, disabled: inactive, busy }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: sizes.minTouch + spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: pressed ? colors.surfaceMuted : undefined,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      {icon && <IconTile icon={icon} tone={iconTone} size={ICON_SIZE} />}
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="body" weight="semibold">
          {title}
        </Text>
        {hint && (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        )}
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Switch
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
            // The off thumb is dark enough to see against the pale track; the
            // platform default (white on light grey) is close to invisible.
            trackColor={{ false: colors.track, true: colors.primary }}
            thumbColor={value ? colors.onPrimary : colors.textMuted}
            ios_backgroundColor={colors.track}
          />
        </View>
      )}
    </Pressable>
  );
}
