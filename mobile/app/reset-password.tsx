import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import PasswordInput from '@/components/PasswordInput';
import { extractRecoveryTokens } from '@/lib/deep-link-recovery';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';
import { MIN_PASSWORD_LENGTH } from '@/lib/validation';

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
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const keyboardHeight = useKeyboardHeight();

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
      <ScrollView contentContainerStyle={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtitle}>{t('resetLinkVerifying')}</Text>
      </ScrollView>
    );
  }

  if (status === 'invalid') {
    return (
      <ScrollView contentContainerStyle={styles.centered}>
        <Text style={styles.error}>{t('invalidOrExpiredResetLink')}</Text>
        <Pressable onPress={() => router.replace('/(auth)/forgot-password')}>
          <Text style={styles.link}>{t('requestNewResetLinkLink')}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={Platform.OS === 'ios'}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.container, { paddingBottom: keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t('resetPasswordTitle')}</Text>

        <PasswordInput
          inputRef={passwordInputRef}
          placeholder={t('newPasswordPlaceholder')}
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
          onFocus={() => scrollInputIntoView(scrollViewRef.current, passwordInputRef)}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('resetPasswordButton')}</Text>
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
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  centered: {
    flexGrow: 1,
    alignItems: 'center',
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
  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
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
    textAlign: 'center',
  },
  link: {
    textAlign: 'center',
    marginTop: 16,
    color: '#2f95dc',
    fontSize: 14,
  },
});
