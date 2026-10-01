import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View, type ScrollView, type TextInput } from 'react-native';

import AuthHeader from '@/components/AuthHeader';
import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import { markOnboardingPending } from '@/lib/onboarding-storage';
import { PERSONA_LABEL, parsePersona, personaRole } from '@/lib/personas';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { openUserGuide } from '@/lib/user-guide';
import { isValidEmail, isValidPhone, MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { useTheme } from '@/theme';

// profiles.phone's unique index violation — see
// supabase/migrations/20260828063528_phone_login_and_password_reset.sql.
const PHONE_UNIQUE_VIOLATION = '23505';

// Deep link the confirmation email points at, so tapping it reopens the
// app rather than dead-ending in a browser — same pattern as
// RESET_PASSWORD_REDIRECT_URL in forgot-password.tsx. Bare scheme (no
// path): the root layout routes by session/role from here. Must also be
// allow-listed in Supabase → Authentication → URL Configuration.
const EMAIL_CONFIRM_REDIRECT_URL = 'safepath://';

export default function SignUpScreen() {
  const { t, language } = useLanguage();
  const { colors, radius, spacing } = useTheme();
  const router = useRouter();
  // Chosen on the welcome screen. A direct link without one signs up a
  // student, as before personas existed.
  const persona = parsePersona(useLocalSearchParams<{ persona?: string }>().persona);
  const role = personaRole(persona);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const fullNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSignUp = async () => {
    setError(null);
    setInfo(null);

    if (fullName.trim().length === 0) {
      setError(t('enterYourName'));
      return;
    }
    const trimmedPhone = phone.trim();
    if (!isValidPhone(trimmedPhone)) {
      setError(t('invalidPhone'));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t('invalidEmail'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('passwordTooShort', { n: MIN_PASSWORD_LENGTH }));
      return;
    }

    setSubmitting(true);

    // No phone-availability check here: an anonymous "is this number
    // taken?" answer would let anyone enumerate registered phones. If the
    // number is already in use, handle_new_user() creates the account
    // without it, and PhoneNotSavedNotice tells the owner after their
    // first sign-in.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: EMAIL_CONFIRM_REDIRECT_URL,
        // This project requires email confirmation, so there is no session
        // yet to update the profile with; handle_new_user() copies these
        // from the signup metadata instead (see
        // supabase/migrations/20260821190552_profiles.sql and
        // 20260828091441_phone_survives_email_confirmation.sql). `language`
        // is the current choice, including one made on the welcome screen.
        data: {
          full_name: fullName.trim(),
          role,
          preferred_language: language,
          phone: trimmedPhone,
        },
      },
    });

    if (signUpError) {
      setSubmitting(false);
      // Supabase's own message (e.g. "User already registered") is more
      // useful than a generic one.
      setError(signUpError.message);
      return;
    }

    // Shows the onboarding carousel once, the first time this account
    // lands in the app — see lib/onboarding-storage.ts. With email
    // confirmation that is usually a later sign-in, not this request.
    if (data.user) {
      markOnboardingPending(data.user.id);
    }

    if (!data.session) {
      setSubmitting(false);
      setInfo(t('checkEmailConfirm'));
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role,
        full_name: fullName.trim(),
        phone: trimmedPhone,
        preferred_language: language,
      })
      .eq('id', data.session.user.id);

    setSubmitting(false);

    if (profileError) {
      setError(
        profileError.code === PHONE_UNIQUE_VIOLATION
          ? t('duplicatePhoneError')
          : profileError.message
      );
    }

    // No navigation on success: AuthProvider picks up the session and the
    // root layout redirects into the app.
  };

  const personaLabel = t(PERSONA_LABEL[persona]);

  return (
    <Screen background="auth" scrollRef={scrollRef} contentStyle={{ gap: spacing.xl }}>
      <AuthHeader leading="back" />

      <View style={{ gap: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: spacing.sm,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
            borderRadius: radius.pill,
            backgroundColor: colors.primarySoft,
          }}
        >
          <Text variant="label" color="onPrimarySoft">
            {t('signingUpAs', { persona: personaLabel })}
          </Text>
          <Text
            variant="label"
            color="onPrimarySoft"
            accessibilityRole="link"
            accessibilityLabel={`${t('changeLink')}: ${personaLabel}`}
            onPress={() => router.dismissTo('/(auth)')}
            style={{ textDecorationLine: 'underline' }}
          >
            {t('changeLink')}
          </Text>
        </View>
        <Text variant="display" accessibilityRole="header">
          {t('signUpTitle')}
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Input
          ref={fullNameRef}
          label={t('fullNameLabel')}
          placeholder={t('fullNamePlaceholder')}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          value={fullName}
          onChangeText={setFullName}
          onFocus={() => scrollInputIntoView(scrollRef.current, fullNameRef)}
          onSubmitEditing={() => phoneRef.current?.focus()}
        />
        <Input
          ref={phoneRef}
          label={t('phoneLabel')}
          autoComplete="tel"
          keyboardType="phone-pad"
          returnKeyType="next"
          value={phone}
          onChangeText={setPhone}
          onFocus={() => scrollInputIntoView(scrollRef.current, phoneRef)}
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <Input
          ref={emailRef}
          label={t('emailLabel')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="next"
          value={email}
          onChangeText={setEmail}
          onFocus={() => scrollInputIntoView(scrollRef.current, emailRef)}
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <PasswordInput
          ref={passwordRef}
          label={t('passwordLabel')}
          helper={t('passwordSignupHelper', { n: MIN_PASSWORD_LENGTH })}
          autoComplete="password-new"
          returnKeyType="done"
          value={password}
          onChangeText={setPassword}
          onFocus={() => scrollInputIntoView(scrollRef.current, passwordRef)}
        />
        {error && <Banner tone="danger" message={error} />}
        {info && <Banner tone="success" message={info} />}
      </View>

      <View style={{ marginTop: 'auto', gap: spacing.md }}>
        <Button
          title={t('createAccountButton')}
          loading={submitting}
          loadingTitle={t('creatingAccountButton')}
          onPress={handleSignUp}
        />
        <Text align="center">
          {t('haveAccountPrompt')}{' '}
          <Text
            weight="bold"
            accessibilityRole="link"
            onPress={() => router.replace('/(auth)/sign-in')}
            style={{ textDecorationLine: 'underline' }}
          >
            {t('logInLink')}
          </Text>
        </Text>
        <Button title={t('userManualLink')} variant="ghost" size="small" onPress={openUserGuide} />
      </View>
    </Screen>
  );
}
