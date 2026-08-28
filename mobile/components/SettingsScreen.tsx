import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import RoleBadge from '@/components/RoleBadge';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

// Shared between the student ((tabs)/settings.tsx) and guardian
// ((guardian)/settings.tsx) tab groups — this list and sign-out don't
// differ by role, so this one component backs both routes rather than
// duplicating it. The one role-specific row (Emergency Contacts,
// relevant only to the at-risk-user/student role) is conditional on
// `role`.
//
// A simple navigation list — every actual toggleable/editable setting
// lives in its own screen now (LanguageSettingsScreen,
// PhoneNumberSettingsScreen, SafetyFeaturesScreen, ChangePasswordScreen,
// the existing Emergency Contacts screen), reachable by tapping a row
// here, matching the pattern Change Password and Emergency Contacts
// already used before this restructuring. This screen itself doesn't
// own any of that underlying logic — it only navigates to it. Sign Out
// stays a direct action here rather than its own screen, since it
// doesn't need one.
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('settingsTitle')}</Text>
      {session?.user.email && (
        <Text style={styles.email}>{t('signedInAs', { email: session.user.email })}</Text>
      )}
      <RoleBadge style={styles.roleBadge} />

      <Pressable style={styles.linkButton} onPress={() => router.push('/language')}>
        <Text style={styles.linkButtonText}>{t('languageLabel')}</Text>
      </Pressable>

      <Pressable style={styles.linkButton} onPress={() => router.push('/phone-number')}>
        <Text style={styles.linkButtonText}>{t('phonePlaceholder')}</Text>
      </Pressable>

      <Pressable style={styles.linkButton} onPress={() => router.push('/change-password')}>
        <Text style={styles.linkButtonText}>{t('changePasswordLink')}</Text>
      </Pressable>

      {role === 'user' && (
        <Pressable style={styles.linkButton} onPress={() => router.push('/emergency-contacts')}>
          <Text style={styles.linkButtonText}>{t('emergencyContactsLink')}</Text>
        </Pressable>
      )}

      <Pressable style={styles.linkButton} onPress={() => router.push('/safety-features')}>
        <Text style={styles.linkButtonText}>{t('safetyFeaturesLink')}</Text>
      </Pressable>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
  // Explicit, not omitted: relying on inherited/'auto' alignSelf to
  // shrink-wrap a Text with backgroundColor+padding turned out to render
  // correctly on web but stretch full-width on native (confirmed via
  // screenshot) — the exact bug this fixes. Never leave this to
  // inheritance for RoleBadge; every placement sets it explicitly.
  roleBadge: {
    alignSelf: 'center',
  },
  linkButton: {
    marginTop: 12,
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
