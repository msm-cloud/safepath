import type { SymbolViewProps } from 'expo-symbols';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme';
import { SurfaceToneContext } from '@/theme/surface-tone';

import IconTile from './IconTile';
import Text from './Text';

export type ActionTileProps = {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
};

const ICON_SIZE = 40;

// A square-ish shortcut for a grid of quick actions (Home tiles).
export default function ActionTile({ icon, label, onPress, accessibilityHint }: ActionTileProps) {
  const { colors, radius, shadows, spacing } = useTheme();

  return (
    <SurfaceToneContext value="default">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => ({
          flex: 1,
          gap: spacing.sm,
          padding: spacing.md + 2,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: pressed ? colors.borderInput : colors.border,
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          boxShadow: shadows.sm,
        })}
      >
        <IconTile icon={icon} tone="primarySoft" size={ICON_SIZE} />
        <Text variant="label">{label}</Text>
      </Pressable>
    </SurfaceToneContext>
  );
}
