import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { useTheme, type ThemeColors } from '@/theme';
import { useSurfaceTone } from '@/theme/surface-tone';

import Text, { type TextColor } from './Text';

export type ButtonVariant = 'ink' | 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: ButtonVariant;
  size?: 'default' | 'small';
  icon?: SymbolViewProps['name'];
  loading?: boolean;
  fullWidth?: boolean;
};

type VariantColors = {
  bg: keyof ThemeColors | 'transparent';
  pressedBg: keyof ThemeColors | 'transparent';
  label: TextColor;
  border?: keyof ThemeColors;
};

const VARIANTS: Record<ButtonVariant, VariantColors> = {
  ink: { bg: 'ink', pressedBg: 'inkPressed', label: 'onInk' },
  primary: { bg: 'primary', pressedBg: 'primaryPressed', label: 'onPrimary' },
  secondary: { bg: 'surface', pressedBg: 'surfaceMuted', label: 'text', border: 'borderInput' },
  ghost: { bg: 'transparent', pressedBg: 'surfaceMuted', label: 'primary' },
  danger: { bg: 'danger', pressedBg: 'dangerPressed', label: 'onDanger' },
  dangerOutline: {
    bg: 'surface',
    pressedBg: 'dangerSoft',
    label: 'dangerText',
    border: 'dangerBorder',
  },
};

// Large text settings can push a label past the button's fixed height; cap
// the scale here and let the rest of the screen scale freely.
const MAX_LABEL_SCALE = 1.4;

export default function Button({
  title,
  variant = 'ink',
  size = 'default',
  icon,
  loading = false,
  fullWidth = true,
  disabled,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { colors, radius, sizes, spacing } = useTheme();
  const tone = useSurfaceTone();
  const spec = VARIANTS[variant];
  const inactive = !!disabled || loading;

  const color = (key: keyof ThemeColors | 'transparent') =>
    key === 'transparent' ? 'transparent' : colors[key];

  const labelColor: TextColor = inactive && variant !== 'ghost' ? 'textDisabled' : spec.label;
  // A ghost button on a photo has no fill of its own, so it follows the
  // overlay text colour like any other text there.
  const iconTint = tone === 'image' && variant === 'ghost' ? colors.onOverlay : colors[labelColor];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: size === 'small' ? sizes.buttonSmall : sizes.button,
          borderRadius: size === 'small' ? radius.md : radius.lg,
          paddingHorizontal: size === 'small' ? spacing.lg : spacing.xl,
          backgroundColor:
            inactive && variant !== 'ghost'
              ? colors.track
              : color(pressed ? spec.pressedBg : spec.bg),
          borderColor: spec.border && !inactive ? colors[spec.border] : 'transparent',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: inactive && variant === 'ghost' ? 0.5 : 1,
        },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors[labelColor]} />
      ) : (
        <View style={[styles.content, { gap: spacing.sm }]}>
          {icon && <SymbolView name={icon} tintColor={iconTint} size={20} />}
          <Text
            variant={size === 'small' ? 'label' : 'button'}
            color={labelColor}
            maxFontSizeMultiplier={MAX_LABEL_SCALE}
            numberOfLines={2}
            align="center"
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
