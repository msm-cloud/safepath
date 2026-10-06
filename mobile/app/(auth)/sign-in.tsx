import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View, type ScrollView, type TextInput } from 'react-native';

import AuthHeader from '@/components/AuthHeader';
import LocationPrivacyNote from '@/components/LocationPrivacyNote';
import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { phoneSignIn } from '@/lib/auth-identifier';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { openUserGuide } from '@/lib/user-guide';
import { isValidEmail, isValidPhone, MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function SignInScreen() {
  const { t } = useLanguage();
  const { spacing } = useTheme();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSignIn = async () => {
    setError(null);

    const trimmed = identifier.trim();
    if (!isValidEmail(trimmed) && !isValidPhone(trimmed)) {
      setError(t('invalidEmailOrPhone'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('passwordTooShort', { n: MIN_PASSWORD_LENGTH }));
      return;
    }

    setSubmitting(true);
    const errorMessage = isValidEmail(trimmed)
      ? await signInWithEmail(trimmed)
      : await signInWithPhone(trimmed);
    setSubmitting(false);
    setError(errorMessage);

    // No navigation on success: AuthProvider picks up the session and
    // Stack.Protected in the root layout routes by the stored profile.role.
  };

  // Each returns the message to show, or null on success.
  const signInWithEmail = async (email: string): Promise<string | null> => {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
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
    <Screen background="auth" scrollRef={scrollRef} contentStyle={{ gap: spacing.xl }}>
      <AuthHeader leading="brand" />

      <View style={{ gap: spacing.xs }}>
        <Text variant="display" accessibilityRole="header">
          {t('logInHeadline')}
        </Text>
        <Text variant="title" importantForAccessibility="no" accessibilityElementsHidden>
          {t('logInHeadlineAccent')}
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Input
          ref={identifierRef}
          label={t('identifierLabel')}
          autoCapitalize="none"
          autoComplete="username"
          // Neither "email-address" nor "phone-pad" suits both; "default"
          // is the only layout that types digits and letters reasonably.
          keyboardType="default"
          returnKeyType="next"
          value={identifier}
          onChangeText={setIdentifier}
          onFocus={() => scrollInputIntoView(scrollRef.current, identifierRef)}
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <View style={{ gap: spacing.sm }}>
          <PasswordInput
            ref={passwordRef}
            label={t('passwordLabel')}
            autoComplete="password"
            returnKeyType="go"
            value={password}
            onChangeText={setPassword}
            onFocus={() => scrollInputIntoView(scrollRef.current, passwordRef)}
            onSubmitEditing={handleSignIn}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Button
              title={t('forgotPasswordLink')}
              variant="ghost"
              size="small"
              fullWidth={false}
              onPress={() => router.push('/(auth)/forgot-password')}
            />
          </View>
        </View>
        {error && <Banner tone="danger" message={error} />}
      </View>

      <View style={{ marginTop: 'auto', gap: spacing.md }}>
        <LocationPrivacyNote />
        <Button
          title={t('logInButton')}
          loading={submitting}
          loadingTitle={t('loggingInButton')}
          onPress={handleSignIn}
        />
        <Text align="center">
          {t('newToSafePathPrompt')}{' '}
          <Text
            weight="bold"
            accessibilityRole="link"
            // Back to the welcome screen to pick a persona first.
            onPress={() => router.dismissTo('/(auth)')}
            style={{ textDecorationLine: 'underline' }}
          >
            {t('createAccountLink')}
          </Text>
        </Text>
        <Button title={t('userManualLink')} variant="ghost" size="small" onPress={openUserGuide} />
      </View>
    </Screen>
  );
}
