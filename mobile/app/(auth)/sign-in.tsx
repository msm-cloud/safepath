import { Link, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import PasswordInput from '@/components/PasswordInput';
import { phoneSignIn } from '@/lib/auth-identifier';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';
import { isValidEmail, isValidPhone, MIN_PASSWORD_LENGTH } from '@/lib/validation';

// Publicly hosted in Supabase Storage (manuals bucket) — opened in the
// system browser via Linking.openURL, same pattern as the map links in
// app/(tabs)/index.tsx and app/(guardian)/index.tsx.
const USER_MANUAL_URL =
  'https://njeqiynkyjftlfhodqce.supabase.co/storage/v1/object/public/manuals/SafePath_User_Manual.pdf';

export default function SignInScreen() {
  const { t } = useLanguage();
  // Carried from the welcome screen (see app/(auth)/index.tsx) — purely UI
  // framing (which heading to show, and forwarded to sign-up if the person
  // taps through). Never used to decide routing for an *existing* account:
  // after a successful sign-in, the root layout routes by the real
  // profile.role fetched from the database (see lib/auth-context.tsx), not
  // by this param.
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const keyboardHeight = useKeyboardHeight();

  const heading =
    role === 'guardian'
      ? t('guardianSignInHeading')
      : role === 'user'
        ? t('studentSignInHeading')
        : t('signInTitle');

  const handleSignIn = async () => {
    setError(null);

    const identifier = email.trim();
    if (!isValidEmail(identifier) && !isValidPhone(identifier)) {
      setError(t('invalidEmailOrPhone'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('passwordTooShort', { n: MIN_PASSWORD_LENGTH }));
      return;
    }

    setSubmitting(true);
    const errorMessage = isValidEmail(identifier)
      ? await signInWithEmail(identifier)
      : await signInWithPhone(identifier);
    setSubmitting(false);
    setError(errorMessage);

    // No navigation call needed on success: the session change is picked
    // up by AuthProvider, and Stack.Protected in the root layout redirects
    // to the right tab group (by the real profile.role) automatically.
  };

  // Each returns the message to show, or null on success.
  const signInWithEmail = async (emailAddress: string): Promise<string | null> => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailAddress,
      password,
    });
    if (!signInError) return null;
    // Our own copy for a wrong password, so it matches the phone path
    // exactly. Anything else (unconfirmed email, network) keeps
    // Supabase's message.
    return signInError.code === 'invalid_credentials'
      ? t('invalidCredentials')
      : signInError.message;
  };

  // The edge function looks up the email server-side, so the app never
  // learns which email (if any) is behind a phone number.
  const signInWithPhone = async (phone: string): Promise<string | null> => {
    const result = await phoneSignIn(phone, password);
    switch (result.kind) {
      case 'ok':
        return null;
      case 'invalid_credentials':
        return t('invalidCredentials');
      case 'email_not_confirmed':
        return t('emailNotConfirmed');
      case 'rate_limited':
        return t('tooManyAttempts');
      case 'error':
        return t('signInUnavailable');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // On Android, KeyboardAvoidingView unconditionally triggers
      // LayoutAnimation on every keyboard show/hide event regardless of
      // `behavior` (confirmed by reading its source), which can knock a
      // focused TextInput out of focus and cause a show/hide loop — see
      // components/SettingsScreen.tsx's comment for the full
      // investigation. enabled={false} on Android doesn't change this
      // component's rendered output there at all (render() switches on
      // `behavior`, not `enabled`), so this is safe everywhere it's used.
      enabled={Platform.OS === 'ios'}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.container, { paddingBottom: keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{heading}</Text>

        <TextInput
          ref={emailInputRef}
          style={styles.input}
          placeholder={t('emailOrPhonePlaceholder')}
          autoCapitalize="none"
          autoComplete="username"
          // Neither "email-address" nor "phone-pad" alone works well for
          // both — the former hides useful digit keys, the latter hides
          // letters entirely. "default" is the only layout that types
          // both reasonably.
          keyboardType="default"
          value={email}
          onChangeText={setEmail}
          onFocus={() => scrollInputIntoView(scrollViewRef.current, emailInputRef)}
        />
        <PasswordInput
          inputRef={passwordInputRef}
          placeholder={t('passwordPlaceholder')}
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          onFocus={() => scrollInputIntoView(scrollViewRef.current, passwordInputRef)}
        />

        <Link href="/(auth)/forgot-password" style={styles.forgotPasswordLink}>
          {t('forgotPasswordLink')}
        </Link>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('signInButton')}</Text>
          )}
        </Pressable>

        <Link
          href={{ pathname: '/(auth)/sign-up', params: role ? { role } : undefined }}
          style={styles.link}
        >
          {t('signUpLink')}
        </Link>

        <Pressable onPress={() => Linking.openURL(USER_MANUAL_URL)}>
          <Text style={styles.userManualLink}>{t('userManualLink')}</Text>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
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
  link: {
    textAlign: 'center',
    marginTop: 16,
    color: '#2f95dc',
    fontSize: 14,
  },
  forgotPasswordLink: {
    textAlign: 'right',
    color: '#2f95dc',
    fontSize: 14,
  },
  userManualLink: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
    fontSize: 13,
  },
});
