import { Alert, View } from 'react-native';

import Card from '@/components/ui/Card';
import Screen from '@/components/ui/Screen';
import SegmentedControl from '@/components/ui/SegmentedControl';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import type { Language } from '@/lib/translations';
import { useTheme } from '@/theme';

// Shared between the student ((tabs)/language.tsx) and guardian
// ((guardian)/language.tsx) tab groups. Same control as the language
// switch on the signed-out screens.
export default function LanguageSettingsScreen() {
  const { t, language, setLanguage } = useLanguage();
  const { spacing } = useTheme();

  // setLanguage restores the previous language itself when the write fails.
  const choose = async (next: Language) => {
    if (!(await setLanguage(next)))
      Alert.alert(t('settingSaveFailedTitle'), t('settingSaveFailedMessage'));
  };

  return (
    <Screen edges={[]}>
      <Card>
        <View style={{ gap: spacing.md }}>
          <Text variant="label">{t('languageLabel')}</Text>
          <SegmentedControl<Language>
            accessibilityLabel={t('languageLabel')}
            value={language}
            onChange={choose}
            options={[
              { value: 'bn', label: t('languageBn') },
              { value: 'en', label: t('languageEn') },
            ]}
          />
        </View>
      </Card>
    </Screen>
  );
}
