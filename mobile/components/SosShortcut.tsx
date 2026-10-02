import { Pressable, View } from 'react-native';

import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/theme';

const OUTER_RING = 236;
const INNER_RING = 196;
const BUTTON = 156;
const BUTTON_BORDER = 6;

export type SosShortcutProps = {
  onPress: () => void;
};

// The large SOS target on Home. It only opens the SOS tab; the hold to
// send lives there, so this tap can never raise an alert by itself.
export default function SosShortcut({ onPress }: SosShortcutProps) {
  const { t } = useLanguage();
  const { colors, shadows, spacing } = useTheme();

  const ring = (size: number) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  });

  return (
    <View style={[ring(OUTER_RING), { alignSelf: 'center', backgroundColor: colors.dangerSoft }]}>
      <View style={[ring(INNER_RING), { backgroundColor: colors.dangerBorder }]}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('homeSosShortcutLabel')}
          accessibilityHint={t('homeSosShortcutHint')}
          style={({ pressed }) => [
            ring(BUTTON),
            {
              gap: spacing.xxs,
              borderWidth: BUTTON_BORDER,
              borderColor: colors.surface,
              backgroundColor: pressed ? colors.dangerPressed : colors.danger,
              boxShadow: shadows.sos,
            },
          ]}
        >
          <Text variant="h1" color="onDanger" script="latin">
            SOS
          </Text>
          <Text variant="label" color="onDanger" align="center">
            {t('homeSosShortcutCaption')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
