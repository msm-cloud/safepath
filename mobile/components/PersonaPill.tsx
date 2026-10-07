import { useRouter } from 'expo-router';
import { View } from 'react-native';

import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import { PERSONA_LABEL, type Persona } from '@/lib/personas';
import { useTheme } from '@/theme';

// "Signing up as Student · Change" on the auth screens. Change goes back to
// the welcome screen's card picker.
export default function PersonaPill({
  persona,
  labelKey,
}: {
  persona: Persona;
  labelKey: 'signingUpAs' | 'loggingInAs';
}) {
  const { t } = useLanguage();
  const { colors, radius, spacing } = useTheme();
  const router = useRouter();
  const personaLabel = t(PERSONA_LABEL[persona]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.sm,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: colors.primarySoft,
      }}
    >
      <Text variant="label" color="onPrimarySoft">
        {t(labelKey, { persona: personaLabel })}
      </Text>
      <Text
        variant="label"
        color="onPrimarySoft"
        accessibilityRole="link"
        accessibilityLabel={`${t('changeLink')}: ${personaLabel}`}
        onPress={() => router.dismissTo('/(auth)')}
        style={{ textDecorationLine: 'underline' }}
      >
        {t('changeLink')}
      </Text>
    </View>
  );
}
