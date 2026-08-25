import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

// Shared between the student ((tabs)/settings.tsx) and guardian
// ((guardian)/settings.tsx) tab groups — language toggle and sign-out don't
// differ by role, so this one component backs both routes rather than
// duplicating it. The one role-specific bit (the Emergency Contacts link,
// relevant only to the at-risk-user/student role) is conditional on
// `role` rather than split into two components.
export default function SettingsScreen() {
  const { session, role, signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    // No navigation call needed: the session change is picked up by
    // AuthProvider, and Stack.Protected in the root layout redirects to
    // the (auth) group automatically.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settingsTitle')}</Text>
      {session?.user.email && (
        <Text style={styles.email}>{t('signedInAs', { email: session.user.email })}</Text>
      )}

      <View style={styles.languageSectionWrap}>
        <LanguageToggle />
      </View>

      {role === 'user' && (
        <Pressable style={styles.linkButton} onPress={() => router.push('/emergency-contacts')}>
          <Text style={styles.linkButtonText}>{t('emergencyContactsLink')}</Text>
        </Pressable>
      )}

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
  languageSectionWrap: {
    marginTop: 16,
  },
  linkButton: {
    marginTop: 24,
    paddingVertical: 10,
  },
  linkButtonText: {
    color: '#2f95dc',
    fontSize: 15,
    fontWeight: '600',
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
