import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/lib/language-context';

// Shown only when there's no active session (see the `!session` guard in
// app/_layout.tsx) — the very first thing anyone sees before signing in.
// Which button is tapped only carries a `role` param forward to sign-in/
// sign-up as UI framing (which heading to show, what role a *new* account
// gets created with) — it's never trusted to route an existing account;
// that's always decided by the real profile.role after auth succeeds.
export default function WelcomeScreen() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('welcomeTitle')}</Text>
      <Text style={styles.subtitle}>{t('welcomeSubtitle')}</Text>

      <View style={styles.buttonGroup}>
        <Pressable
          style={styles.button}
          onPress={() => router.push({ pathname: '/(auth)/sign-in', params: { role: 'guardian' } })}
        >
          <Text style={styles.buttonText}>{t('signInAsGuardianButton')}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.push({ pathname: '/(auth)/sign-in', params: { role: 'user' } })}
        >
          <Text style={[styles.buttonText, styles.buttonSecondaryText]}>
            {t('signInAsStudentButton')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  button: {
    backgroundColor: '#2f95dc',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2f95dc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#2f95dc',
  },
});
