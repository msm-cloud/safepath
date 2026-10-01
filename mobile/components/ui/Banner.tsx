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

const TONES: Record<BannerTone, { bg: keyof ThemeColors; fg: TextColor }> = {
  primary: { bg: 'primarySoft', fg: 'onPrimarySoft' },
  info: { bg: 'infoSoft', fg: 'onInfoSoft' },
  success: { bg: 'successSoft', fg: 'onSuccessSoft' },
  warning: { bg: 'warningSoft', fg: 'onWarningSoft' },
  danger: { bg: 'dangerSoft', fg: 'onDangerSoft' },
};

export default function Banner({ tone = 'primary', title, message, icon, action }: BannerProps) {
  const { colors, radius, spacing } = useTheme();
  const { bg, fg } = TONES[tone];
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
        {icon && <SymbolView name={icon} tintColor={colors[fg]} size={20} />}
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
