import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, type ScrollView, type TextInput } from 'react-native';

import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import PasswordInput from '@/components/ui/PasswordInput';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { extractRecoveryTokens } from '@/lib/deep-link-recovery';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { useTheme } from '@/theme';

// Deliberately a TOP-LEVEL route (app/reset-password.tsx), not
// app/(auth)/reset-password.tsx — the moment the recovery link's tokens
// are exchanged for a session below (setSession), `session` becomes
// truthy for the whole app. If this screen lived inside the (auth) group
// (guard={!session}) or was reached through any Stack.Protected block,
// the root layout would immediately redirect away to (tabs)/(guardian)
// before the person ever sees the "set a new password" form. A route
// that isn't wrapped in any Stack.Protected guard at all (registered
// directly on the root Stack — see app/_layout.tsx) stays reachable
// regardless of session state, which is what this needs.
type Status = 'verifying' | 'ready' | 'invalid';

export default function ResetPasswordScreen() {
  const { t } = useLanguage();
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    let cancelled = false;

    async function process(url: string | null) {
      // The root layout briefly renders nothing at all while
      // auth-context re-loads the profile role after setSession() below
      // fires its own auth-state-change event (see lib/auth-context.tsx)
      // — which unmounts and remounts this screen along with everything
      // else. On that remount, a session already exists; skip straight
      // to the form instead of re-parsing the URL and calling
      // setSession() a second time (harmless either way, but pointless,
      // and avoids re-triggering another loading flip/remount in a
      // loop if getInitialURL() keeps returning the same cached URL).
      const { data: existing } = await supabase.auth.getSession();
      if (cancelled) return;
      if (existing.session) {
        setStatus('ready');
        return;
      }

      if (!url) {
        setStatus('invalid');
        return;
      }

      const tokens = extractRecoveryTokens(url);
      if (!tokens) {
        setStatus('invalid');
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (cancelled) return;
      setStatus(sessionError ? 'invalid' : 'ready');
    }

    // Cold start (app wasn't running) and already-running both have to be
    // handled explicitly — Expo Router's own file-based linking gets this
    // screen mounted either way, but doesn't hand us the URL's fragment
    // (where the recovery tokens live) through its normal route params.
    Linking.getInitialURL().then(process);
    const subscription = Linking.addEventListener('url', ({ url }) => process(url));

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('passwordTooShort', { n: MIN_PASSWORD_LENGTH }));
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    // Deliberately sign out rather than leaving the recovery session
    // active — routes back to a real sign-in with the new password
    // instead of silently landing signed in, matching what was asked
    // for ("route back to sign-in on success").
    await supabase.auth.signOut();
    setSubmitting(false);
    router.replace('/(auth)/sign-in');
  };

  if (status === 'verifying') {
    return (
      <Screen background="auth" contentStyle={{ justifyContent: 'center', gap: spacing.lg }}>
        <ActivityIndicator size="large" color={colors.onOverlay} />
        <Text align="center">{t('resetLinkVerifying')}</Text>
      </Screen>
    );
  }

  if (status === 'invalid') {
    return (
      <Screen background="auth" contentStyle={{ justifyContent: 'center', gap: spacing.lg }}>
        <Banner tone="danger" message={t('invalidOrExpiredResetLink')} />
        <Button
          title={t('requestNewResetLinkLink')}
          onPress={() => router.replace('/(auth)/forgot-password')}
        />
      </Screen>
    );
  }

  return (
    <Screen background="auth" scrollRef={scrollRef} contentStyle={{ gap: spacing.xl }}>
      <Text variant="display" accessibilityRole="header">
        {t('resetPasswordTitle')}
      </Text>

      <View style={{ gap: spacing.lg }}>
        <PasswordInput
          ref={passwordRef}
          label={t('newPasswordLabel')}
          helper={t('passwordSignupHelper', { n: MIN_PASSWORD_LENGTH })}
          autoComplete="password-new"
          returnKeyType="done"
          value={password}
          onChangeText={setPassword}
          onFocus={() => scrollInputIntoView(scrollRef.current, passwordRef)}
          onSubmitEditing={handleSubmit}
        />
        {error && <Banner tone="danger" message={error} />}
      </View>

      <View style={{ marginTop: 'auto' }}>
        <Button
          title={t('resetPasswordButton')}
          loading={submitting}
          loadingTitle={t('resettingPasswordButton')}
          onPress={handleSubmit}
        />
      </View>
    </Screen>
  );
}
