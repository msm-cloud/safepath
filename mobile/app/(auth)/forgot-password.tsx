import { Link } from 'expo-router';
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
} from 'react-native';

import { useLanguage } from '@/lib/language-context';
import { resolveLoginIdentifier } from '@/lib/resolve-login-identifier';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';
import { isValidEmail, isValidPhone } from '@/lib/validation';

// Deep link the reset email points at — see app/reset-password.tsx (a
// top-level, unguarded route, not under (auth), so the incoming recovery
// session isn't interrupted by Stack.Protected — see that file's own
// comment for why).
const RESET_PASSWORD_REDIRECT_URL = 'safepath://reset-password';

export default function ForgotPasswordScreen() {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const identifierInputRef = useRef<TextInput>(null);
  const keyboardHeight = useKeyboardHeight();

  const handleSubmit = async () => {
    setError(null);

    const trimmed = identifier.trim();
    if (!isValidEmail(trimmed) && !isValidPhone(trimmed)) {
      setError(t('invalidEmailOrPhone'));
      return;
    }

    setSubmitting(true);
    const resolvedEmail = await resolveLoginIdentifier(trimmed);

    // Only actually send an email if the identifier resolved to a real
    // account — but show the exact same success state either way (below,
    // `sent` doesn't distinguish these two branches at all). Calling
    // resetPasswordForEmail with a fabricated address would risk a
    // distinguishable error/timing from Supabase's own side; simply not
    // calling it is the more robust way to guarantee this can't be used
    // to enumerate which emails/phones have accounts.
    if (resolvedEmail) {
      await supabase.auth.resetPasswordForEmail(resolvedEmail, {
        redirectTo: RESET_PASSWORD_REDIRECT_URL,
      });
    }

    setSubmitting(false);
    setSent(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // See sign-in.tsx / components/SettingsScreen.tsx for the full
      // investigation behind this — unconditionally safe on Android.
      enabled={Platform.OS === 'ios'}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.container, { paddingBottom: keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t('forgotPasswordTitle')}</Text>
        <Text style={styles.subtitle}>{t('forgotPasswordSubtitle')}</Text>

        {sent ? (
          <Text style={styles.info}>{t('resetLinkSentMessage')}</Text>
        ) : (
          <>
            <TextInput
              ref={identifierInputRef}
              style={styles.input}
              placeholder={t('emailOrPhonePlaceholder')}
              autoCapitalize="none"
              autoComplete="username"
              keyboardType="default"
              value={identifier}
              onChangeText={setIdentifier}
              onFocus={() => scrollInputIntoView(scrollViewRef.current, identifierInputRef)}
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
                <Text style={styles.buttonText}>{t('sendResetLinkButton')}</Text>
              )}
            </Pressable>
          </>
        )}

        <Link href="/(auth)/sign-in" style={styles.link}>
          {t('backToSignInLink')}
        </Link>
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
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
  info: {
    color: '#1a7f37',
    fontSize: 15,
    textAlign: 'center',
  },
  link: {
    textAlign: 'center',
    marginTop: 16,
    color: '#2f95dc',
    fontSize: 14,
  },
});
