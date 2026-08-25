import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/lib/language-context';

// Self-contained (reads/writes LanguageContext itself, no props needed) so
// it can be reused anywhere LanguageProvider is mounted — both inside
// Settings (components/SettingsScreen.tsx) and on the pre-auth welcome
// screen (app/(auth)/index.tsx), which sits inside the same provider (see
// app/_layout.tsx: LanguageProvider wraps the whole Stack, auth included).
export default function LanguageToggle() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('languageLabel')}</Text>
      <View style={styles.switch}>
        <Pressable
          style={[styles.option, language === 'bn' && styles.optionActive]}
          onPress={() => setLanguage('bn')}
        >
          <Text style={[styles.optionText, language === 'bn' && styles.optionTextActive]}>
            {t('languageBn')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.option, language === 'en' && styles.optionActive]}
          onPress={() => setLanguage('en')}
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
