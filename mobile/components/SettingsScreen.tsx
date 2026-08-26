import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import LanguageToggle from '@/components/LanguageToggle';
import RoleBadge from '@/components/RoleBadge';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { useUserSettings } from '@/lib/user-settings-context';

// Shared between the student ((tabs)/settings.tsx) and guardian
// ((guardian)/settings.tsx) tab groups — language toggle and sign-out don't
// differ by role, so this one component backs both routes rather than
// duplicating it. The one role-specific bit (the Emergency Contacts link,
// relevant only to the at-risk-user/student role) is conditional on
// `role` rather than split into two components. Shake-to-trigger SOS and
// the fake-call escape are both available regardless of role — the
// underlying triggerSos() works identically for any signed-in account,
// and the fake-call button is likewise not student-specific.
export default function SettingsScreen() {
  const { session, role, signOut } = useAuth();
  const { t } = useLanguage();
  const {
    shakeSosEnabled,
    fakeCallEnabled,
    fakeCallCallerName,
    setShakeSosEnabled,
    setFakeCallEnabled,
    setFakeCallCallerName,
  } = useUserSettings();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const callerNameInputRef = useRef<TextInput>(null);

  // Local draft so every keystroke doesn't hit the network — persisted via
  // setFakeCallCallerName (which itself updates context immediately, same
  // "optimistic update" pattern as setLanguage) only on blur. useState's
  // initializer alone isn't enough here: fakeCallCallerName arrives
  // asynchronously (fetched from the database after mount), so this
  // effect re-syncs the draft once that real value actually loads —
  // without it, the field would be stuck showing empty even for someone
  // who'd previously saved a name.
  const [callerNameDraft, setCallerNameDraft] = useState(fakeCallCallerName ?? '');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs the local draft once the real value arrives asynchronously from useUserSettings; without this the field would be stuck empty for anyone who'd previously saved a name.
    setCallerNameDraft(fakeCallCallerName ?? '');
  }, [fakeCallCallerName]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    // No navigation call needed: the session change is picked up by
    // AuthProvider, and Stack.Protected in the root layout redirects to
    // the (auth) group automatically.
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // See lib/scroll-to-input.ts's comment and the PR description for
      // the full investigation: on Android, KeyboardAvoidingView
      // unconditionally subscribes to keyboard show/hide events and calls
      // LayoutAnimation.configureNext() on every one, REGARDLESS of the
      // `behavior` prop — even behavior={undefined}, which renders a
      // plain View with no style adjustment at all, still pays this cost.
      // Android's LayoutAnimation is known to interact badly with a
      // currently-focused TextInput, and disabling it here is what
      // actually stopped this screen's focus/keyboard show-hide loop.
      // Setting enabled to false only on Android is safe: it does not
      // change this component's rendered output on Android at all
      // (confirmed by reading KeyboardAvoidingView.js — its render()
      // switches on `behavior`, not `enabled`), so this can never regress
      // anything Android was already doing here.
      enabled={Platform.OS === 'ios'}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t('settingsTitle')}</Text>
        {session?.user.email && (
          <Text style={styles.email}>{t('signedInAs', { email: session.user.email })}</Text>
        )}
        <RoleBadge style={styles.roleBadge} />

        <View style={styles.languageSectionWrap}>
          <LanguageToggle />
        </View>

        {role === 'user' && (
          <Pressable style={styles.linkButton} onPress={() => router.push('/emergency-contacts')}>
            <Text style={styles.linkButtonText}>{t('emergencyContactsLink')}</Text>
          </Pressable>
        )}

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('shakeSosToggleLabel')}</Text>
          <Switch value={shakeSosEnabled} onValueChange={setShakeSosEnabled} />
        </View>
        <Text style={styles.toggleHint}>{t('shakeSosToggleHint')}</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('fakeCallToggleLabel')}</Text>
          <Switch value={fakeCallEnabled} onValueChange={setFakeCallEnabled} />
        </View>

        {fakeCallEnabled && (
          <View style={styles.callerNameWrap}>
            <Text style={styles.fieldLabel}>{t('fakeCallCallerNameLabel')}</Text>
            <TextInput
              ref={callerNameInputRef}
              style={styles.input}
              placeholder={t('fakeCallDefaultCallerName')}
              value={callerNameDraft}
              onChangeText={setCallerNameDraft}
              onFocus={() => scrollInputIntoView(scrollViewRef.current, callerNameInputRef)}
              onBlur={() => setFakeCallCallerName(callerNameDraft.trim() || null)}
            />
          </View>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  toggleHint: {
    alignSelf: 'flex-start',
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  callerNameWrap: {
    width: '100%',
    marginTop: 8,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
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
