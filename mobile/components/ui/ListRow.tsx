import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import IconTile, { type IconTileTone } from './IconTile';
import Text from './Text';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  // Current setting shown on the right, e.g. the chosen language.
  value?: string;
  icon?: SymbolViewProps['name'];
  iconTone?: IconTileTone;
  onPress?: () => void;
  accessibilityHint?: string;
};

const ICON_SIZE = 40;

// One row in a ListGroup. Pressable rows show a chevron; rows without
// onPress are read-only.
export default function ListRow({
  title,
  subtitle,
  value,
  icon,
  iconTone = 'neutral',
  onPress,
  accessibilityHint,
}: ListRowProps) {
  const { colors, sizes, spacing } = useTheme();

  const content = (
    <>
      {icon && <IconTile icon={icon} tone={iconTone} size={ICON_SIZE} />}
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="body" weight="semibold">
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        )}
      </View>
      {value && (
        <Text variant="bodySm" color="textMuted" numberOfLines={1} style={{ maxWidth: '40%' }}>
          {value}
        </Text>
      )}
      {onPress && (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={colors.textMuted}
          size={18}
        />
      )}
    </>
  );

  const row = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    minHeight: sizes.minTouch + spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  };

  if (!onPress) {
    return <View style={row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [row, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      {content}
    </Pressable>
  );
}
