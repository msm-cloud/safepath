import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import RoleBadge from '@/components/RoleBadge';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

const CHEVRON_COLOR = '#c7c7cc';

// One card-styled, icon-led row that navigates to its own screen on tap —
// the shared building block for every entry in the list below. Purely
// visual: every row still just calls router.push() to a screen that
// already existed before this pass (see components/SettingsScreen.tsx's
// own history) — no navigation target or underlying logic changed here.
function SettingsRow({
  icon,
  iconColor,
  iconBackgroundColor,
  label,
  onPress,
}: {
  icon: SymbolViewProps['name'];
  iconColor: string;
  iconBackgroundColor: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.iconBadge, { backgroundColor: iconBackgroundColor }]}>
        <SymbolView name={icon} tintColor={iconColor} size={18} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        tintColor={CHEVRON_COLOR}
        size={16}
      />
    </Pressable>
  );
}

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
// here. This screen itself doesn't own any of that underlying logic —
// it only navigates to it. Sign Out stays a direct action here rather
// than its own screen, since it doesn't need one — kept visually
// separated below a divider so it doesn't read as just another row in
// the card list above it.
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

      <View style={styles.rowsList}>
        <SettingsRow
          icon={{ ios: 'globe', android: 'language', web: 'language' }}
          iconColor="#2f95dc"
          iconBackgroundColor="#e8f4fc"
          label={t('languageLabel')}
          onPress={() => router.push('/language')}
        />
        <SettingsRow
          icon={{ ios: 'phone.fill', android: 'phone', web: 'phone' }}
          iconColor="#34c759"
          iconBackgroundColor="#e8f9ee"
          label={t('phonePlaceholder')}
          onPress={() => router.push('/phone-number')}
        />
        <SettingsRow
          icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          iconColor="#8e8e93"
          iconBackgroundColor="#f0f0f1"
          label={t('changePasswordLink')}
          onPress={() => router.push('/change-password')}
        />
        {role === 'user' && (
          <SettingsRow
            icon={{ ios: 'person.2.fill', android: 'people', web: 'people' }}
            iconColor="#ff9500"
            iconBackgroundColor="#fff2e0"
            label={t('emergencyContactsLink')}
            onPress={() => router.push('/emergency-contacts')}
          />
        )}
        <SettingsRow
          icon={{ ios: 'shield.fill', android: 'security', web: 'security' }}
          iconColor="#af52de"
          iconBackgroundColor="#f6ebfb"
          label={t('safetyFeaturesLink')}
          onPress={() => router.push('/safety-features')}
        />
        <SettingsRow
          icon={{ ios: 'questionmark.circle.fill', android: 'help', web: 'help' }}
          iconColor="#30b0c7"
          iconBackgroundColor="#e5f6fa"
          label={t('helpAndTutorialLink')}
          onPress={() => router.push('/tutorial')}
        />
      </View>

      <View style={styles.signOutWrap}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    paddingTop: 32,
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
  rowsList: {
    width: '100%',
    marginTop: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  signOutWrap: {
    width: '100%',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#d33',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
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
