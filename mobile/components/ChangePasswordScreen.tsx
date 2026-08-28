import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import PasswordInput from '@/components/PasswordInput';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';
import { MIN_PASSWORD_LENGTH } from '@/lib/validation';

// How long the success message stays visible before navigating back to
// Settings — long enough to actually read it, short enough not to feel
// like an extra step.
const SUCCESS_NAVIGATE_BACK_DELAY_MS = 1200;

// Shared between the student ((tabs)/change-password.tsx) and guardian
// ((guardian)/change-password.tsx) tab groups, same reasoning/pattern as
// components/SettingsScreen.tsx — reachable via router.push() from
// Settings in either stack, not its own tab (href: null in both
// _layout.tsx files).
//
// Distinct from the Forgot Password flow (app/(auth)/forgot-password.tsx
// + app/reset-password.tsx): this is for someone already signed in who
// knows their current password and just wants to change it — no email,
// no recovery link, no identifier-enumeration concerns (the person is
// already authenticated), so errors here can be as specific as they
// actually are instead of collapsed into one generic message.
export default function ChangePasswordScreen() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const currentPasswordInputRef = useRef<TextInput>(null);
  const newPasswordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const keyboardHeight = useKeyboardHeight();

  const handleChangePassword = async () => {
    setError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t('passwordTooShort', { n: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    const email = session?.user.email;
    if (!email) return; // defensive — this screen is only reachable while signed in

    setSubmitting(true);

    // Verify the current password is actually correct before changing
    // anything — protects against someone with brief physical access to
    // an already-unlocked device changing the account owner's password
    // without knowing it. This does re-authenticate (replaces the active
    // session with a fresh one on success), which is harmless here: same
    // user, same account — nothing about routing or role depends on
    // which specific session token is current.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verifyError) {
      setSubmitting(false);
      setError(t('currentPasswordIncorrect'));
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);

    if (updateError) {
      // Anything other than the two cases above — surface Supabase's own
      // message rather than a generic one, same as sign-in/sign-up
      // already do for their own non-enumeration-sensitive errors.
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.back(), SUCCESS_NAVIGATE_BACK_DELAY_MS);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // See SettingsScreen.tsx / sign-in.tsx for the full investigation —
      // unconditionally safe on Android.
      enabled={Platform.OS === 'ios'}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.container, { paddingBottom: keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerIconBadge}>
          <SymbolView
            name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            tintColor="#8e8e93"
            size={26}
          />
        </View>
        <Text style={styles.title}>{t('changePasswordLink')}</Text>

        {success ? (
          <Text style={styles.success}>{t('passwordChangedMessage')}</Text>
        ) : (
          <View style={styles.card}>
            <PasswordInput
              inputRef={currentPasswordInputRef}
              placeholder={t('currentPasswordPlaceholder')}
              autoComplete="current-password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              onFocus={() => scrollInputIntoView(scrollViewRef.current, currentPasswordInputRef)}
            />
            <PasswordInput
              inputRef={newPasswordInputRef}
              placeholder={t('newPasswordPlaceholder')}
              autoComplete="password-new"
              value={newPassword}
              onChangeText={setNewPassword}
              onFocus={() => scrollInputIntoView(scrollViewRef.current, newPasswordInputRef)}
            />
            <PasswordInput
              inputRef={confirmPasswordInputRef}
              placeholder={t('confirmNewPasswordPlaceholder')}
              autoComplete="password-new"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => scrollInputIntoView(scrollViewRef.current, confirmPasswordInputRef)}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('changePasswordLink')}</Text>
              )}
            </Pressable>
          </View>
        )}
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
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  headerIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f0f0f1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 4,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  button: {
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#d33',
    fontSize: 14,
  },
  success: {
    color: '#1a7f37',
    fontSize: 16,
    textAlign: 'center',
  },
});
