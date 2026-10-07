import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View, type ScrollView, type TextInput } from 'react-native';

import AuthHeader from '@/components/AuthHeader';
import LocationPrivacyNote from '@/components/LocationPrivacyNote';
import PersonaPill from '@/components/PersonaPill';
import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { useAuth, type ProfileRole } from '@/lib/auth-context';
import { phoneSignIn } from '@/lib/auth-identifier';
import { useLanguage } from '@/lib/language-context';
import { PERSONA_LABEL, parsePersona, personaForRole, roleMismatchMessage } from '@/lib/personas';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { openUserGuide } from '@/lib/user-guide';
import { isValidEmail, isValidPhone, MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function SignInScreen() {
  const { t } = useLanguage();
  const { spacing } = useTheme();
  const router = useRouter();
  const { signInAs } = useAuth();
  // The card picked on the welcome screen. Absent when sign-in is reached
  // without one (after a password reset): the account then routes by its
  // own role.
  const personaParam = useLocalSearchParams<{ persona?: string }>().persona;
  const persona = personaParam ? parsePersona(personaParam) : null;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Set when the account belongs to the other card; offers to switch.
  const [mismatchRole, setMismatchRole] = useState<ProfileRole | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSignIn = async () => {
    setError(null);
    setMismatchRole(null);

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
    const attempt = async () => ({
      error: isValidEmail(trimmed)
        ? await signInWithEmail(trimmed)
        : await signInWithPhone(trimmed),
    });
    if (!persona) {
      setError((await attempt()).error);
      setSubmitting(false);
      return;
    }
    const result = await signInAs(persona, attempt);
    setSubmitting(false);
    if (result.kind === 'role_mismatch') {
      setMismatchRole(result.role);
      setError(t(roleMismatchMessage(result.role)));
    } else if (result.kind === 'failed') {
      setError(result.message ?? t('signInUnavailable'));
    }

    // No navigation on success: AuthProvider routes by the stored
    // profile.role through Stack.Protected in the root layout.
  };

  // Keeps what was typed; only the card changes.
  const switchPersona = (role: ProfileRole) => {
    router.setParams({ persona: personaForRole(role) });
    setMismatchRole(null);
    setError(null);
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
        {persona && <PersonaPill persona={persona} labelKey="loggingInAs" />}
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
        {mismatchRole && (
          <Button
            title={t('switchToPersona', {
              persona: t(PERSONA_LABEL[personaForRole(mismatchRole)]),
            })}
            variant="secondary"
            onPress={() => switchPersona(mismatchRole)}
          />
        )}
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
