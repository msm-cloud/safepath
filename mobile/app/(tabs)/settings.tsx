import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    // No navigation call needed: the session change is picked up by
    // AuthProvider, and Stack.Protected in the root layout redirects to the
    // (auth) group automatically.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settingsTitle')}</Text>
      {session?.user.email && (
        <Text style={styles.email}>{t('signedInAs', { email: session.user.email })}</Text>
      )}

      <View style={styles.languageSection}>
        <Text style={styles.languageLabel}>{t('languageLabel')}</Text>
        <View style={styles.languageSwitch}>
          <Pressable
            style={[styles.languageOption, language === 'bn' && styles.languageOptionActive]}
            onPress={() => setLanguage('bn')}
          >
            <Text
              style={[
                styles.languageOptionText,
                language === 'bn' && styles.languageOptionTextActive,
              ]}
            >
              {t('languageBn')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.languageOption, language === 'en' && styles.languageOptionActive]}
            onPress={() => setLanguage('en')}
          >
            <Text
              style={[
                styles.languageOptionText,
                language === 'en' && styles.languageOptionTextActive,
              ]}
            >
              {t('languageEn')}
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[styles.button, signingOut && styles.buttonDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t('signOutButton')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  languageSection: {
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  languageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  languageSwitch: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  languageOption: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  languageOptionActive: {
    backgroundColor: '#2f95dc',
  },
  languageOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  languageOptionTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#d33',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
