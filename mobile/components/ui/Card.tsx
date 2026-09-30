import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type Spacing } from '@/theme';
import { SurfaceToneContext } from '@/theme/surface-tone';

export type CardProps = {
  children: ReactNode;
  variant?: 'plain' | 'muted';
  padding?: Spacing;
  // Pressable cards (e.g. the role picker) show a selected state; plain
  // content cards leave both of these unset.
  onPress?: () => void;
  selected?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export default function Card({
  children,
  variant = 'plain',
  padding = 'lg',
  onPress,
  selected = false,
  accessibilityLabel,
  style,
}: CardProps) {
  const { colors, radius, shadows, spacing } = useTheme();

  const base: ViewStyle = {
    padding: spacing[padding],
    borderRadius: radius.lg,
    borderWidth: selected ? 2 : 1.5,
    borderColor: selected ? colors.primary : colors.border,
    backgroundColor: selected
      ? colors.primarySoft
      : variant === 'muted'
        ? colors.surfaceMuted
        : colors.surface,
    boxShadow: variant === 'plain' && !selected ? shadows.sm : undefined,
  };

  // A card is always an opaque surface, so content inside it uses normal
  // text colours even when the screen behind it is a photo.
  const content = <SurfaceToneContext value="default">{children}</SurfaceToneContext>;

  if (!onPress) {
    return <View style={[base, style]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        base,
        pressed && !selected && { borderColor: colors.borderInput },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}
