import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { type ScrollView, type TextInput, View } from 'react-native';

import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import PasswordInput from '@/components/ui/PasswordInput';
import Screen from '@/components/ui/Screen';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { useTheme } from '@/theme';

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
  const { spacing } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const currentPasswordRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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
    <Screen edges={[]} scrollRef={scrollRef} contentStyle={{ gap: spacing.xl }}>
      {success ? (
        <Banner tone="success" message={t('passwordChangedMessage')} />
      ) : (
        <>
          <View style={{ gap: spacing.lg }}>
            <PasswordInput
              ref={currentPasswordRef}
              label={t('currentPasswordLabel')}
              autoComplete="current-password"
              returnKeyType="next"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              onFocus={() => scrollInputIntoView(scrollRef.current, currentPasswordRef)}
              onSubmitEditing={() => newPasswordRef.current?.focus()}
            />
            <PasswordInput
              ref={newPasswordRef}
              label={t('newPasswordLabel')}
              helper={t('passwordSignupHelper', { n: MIN_PASSWORD_LENGTH })}
              autoComplete="password-new"
              returnKeyType="next"
              value={newPassword}
              onChangeText={setNewPassword}
              onFocus={() => scrollInputIntoView(scrollRef.current, newPasswordRef)}
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />
            <PasswordInput
              ref={confirmPasswordRef}
              label={t('confirmNewPasswordLabel')}
              autoComplete="password-new"
              returnKeyType="done"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => scrollInputIntoView(scrollRef.current, confirmPasswordRef)}
              onSubmitEditing={handleChangePassword}
            />
            {error && <Banner tone="danger" message={error} />}
          </View>

          <View style={{ marginTop: 'auto' }}>
            <Button
              title={t('changePasswordLink')}
              loading={submitting}
              loadingTitle={t('changingPasswordButton')}
              onPress={handleChangePassword}
            />
          </View>
        </>
      )}
    </Screen>
  );
}
