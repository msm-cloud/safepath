import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import { useTheme, type ThemeColors } from '@/theme';
import { SurfaceToneContext } from '@/theme/surface-tone';

import Text, { type TextColor } from './Text';

export type BannerTone = 'primary' | 'info' | 'success' | 'warning' | 'danger';

export type BannerProps = {
  tone?: BannerTone;
  title?: string;
  message: string;
  icon?: SymbolViewProps['name'];
  action?: { label: string; onPress: () => void };
};

type ToneSpec = { bg: keyof ThemeColors; fg: TextColor; icon: SymbolViewProps['name'] };

// Each tone has its own icon so the meaning never rests on colour alone.
const TONES: Record<BannerTone, ToneSpec> = {
  primary: {
    bg: 'primarySoft',
    fg: 'onPrimarySoft',
    icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  },
  info: {
    bg: 'infoSoft',
    fg: 'onInfoSoft',
    icon: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  },
  success: {
    bg: 'successSoft',
    fg: 'onSuccessSoft',
    icon: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  },
  warning: {
    bg: 'warningSoft',
    fg: 'onWarningSoft',
    icon: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  },
  danger: {
    bg: 'dangerSoft',
    fg: 'onDangerSoft',
    icon: { ios: 'exclamationmark.octagon.fill', android: 'error', web: 'error' },
  },
};

export default function Banner({ tone = 'primary', title, message, icon, action }: BannerProps) {
  const { colors, radius, spacing } = useTheme();
  const { bg, fg, icon: toneIcon } = TONES[tone];
  const urgent = tone === 'warning' || tone === 'danger';

  return (
    <SurfaceToneContext value="default">
      <View
        // Warnings and errors are announced as soon as they appear; other
        // tones are read in normal order.
        accessibilityRole={urgent ? 'alert' : undefined}
        accessibilityLiveRegion={urgent ? 'polite' : 'none'}
        style={{
          flexDirection: 'row',
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radius.md,
          backgroundColor: colors[bg],
        }}
      >
        <SymbolView name={icon ?? toneIcon} tintColor={colors[fg]} size={20} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          {title && (
            <Text variant="label" color={fg}>
              {title}
            </Text>
          )}
          <Text variant="bodySm" color={fg}>
            {message}
          </Text>
          {action && (
            <Pressable
              onPress={action.onPress}
              accessibilityRole="button"
              hitSlop={spacing.md}
              style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
            >
              <Text variant="label" color={fg} style={{ textDecorationLine: 'underline' }}>
                {action.label}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SurfaceToneContext>
  );
}
