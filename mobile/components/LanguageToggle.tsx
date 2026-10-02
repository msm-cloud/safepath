import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/lib/language-context';

// Self-contained (reads/writes LanguageContext itself, no props needed) so
// it can be dropped into any screen under LanguageProvider. Signed-out
// screens use the language switch in components/AuthHeader.tsx instead.
export default function LanguageToggle() {
  const { t, language, setLanguage } = useLanguage();

  // setLanguage restores the previous language itself when the write fails.
  const choose = async (next: typeof language) => {
    if (!(await setLanguage(next)))
      Alert.alert(t('settingSaveFailedTitle'), t('settingSaveFailedMessage'));
  };

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('languageLabel')}</Text>
      <View style={styles.switch}>
        <Pressable
          style={[styles.option, language === 'bn' && styles.optionActive]}
          onPress={() => choose('bn')}
        >
          <Text style={[styles.optionText, language === 'bn' && styles.optionTextActive]}>
            {t('languageBn')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.option, language === 'en' && styles.optionActive]}
          onPress={() => choose('en')}
        >
          <Text style={[styles.optionText, language === 'en' && styles.optionTextActive]}>
            {t('languageEn')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  switch: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  optionActive: {
    backgroundColor: '#2f95dc',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  optionTextActive: {
    color: '#fff',
  },
});
