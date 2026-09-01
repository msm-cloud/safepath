import { Link, useLocalSearchParams } from 'expo-router';
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

import PasswordInput from '@/components/PasswordInput';
import { useLanguage } from '@/lib/language-context';
import { markOnboardingPending } from '@/lib/onboarding-storage';
import { resolveLoginIdentifier } from '@/lib/resolve-login-identifier';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';
import { isValidEmail, isValidPhone, MIN_PASSWORD_LENGTH } from '@/lib/validation';

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
  // Carried from the welcome screen (see app/(auth)/index.tsx), via
  // sign-in if the person tapped through from there. Defaults to 'user'
  // (student) if missing — e.g. someone linking directly to /sign-up — to
  // match this screen's pre-existing behavior before roles existed.
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role: 'user' | 'guardian' = roleParam === 'guardian' ? 'guardian' : 'user';

  const heading = role === 'guardian' ? t('guardianSignUpHeading') : t('studentSignUpHeading');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const fullNameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const keyboardHeight = useKeyboardHeight();

  const handleSignUp = async () => {
    setError(null);
    setInfo(null);

    if (fullName.trim().length === 0) {
      setError(t('enterYourName'));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t('invalidEmail'));
      return;
    }
    const trimmedPhone = phone.trim();
    if (!isValidPhone(trimmedPhone)) {
      setError(t('invalidPhone'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('passwordTooShort', { n: MIN_PASSWORD_LENGTH }));
      return;
    }

    setSubmitting(true);

    // Pre-check phone availability before ever creating an account. This
    // project requires email confirmation, so by the time the DB-level
    // unique constraint could otherwise reject a duplicate phone, the
    // account would already exist and the person would be looking at a
    // "check your email" message with no idea their phone silently
    // wasn't saved (see handle_new_user()'s own comment on why a
    // conflict there doesn't fail signup). This has its own small race —
    // someone else could register the same phone between this check and
    // the signUp() call below — which is exactly what that trigger-level
    // handling is the real safety net for, not this; this is purely a
    // same-request UX improvement for the common (non-racing) case.
    const existingEmailForPhone = await resolveLoginIdentifier(trimmedPhone);
    if (existingEmailForPhone) {
      setSubmitting(false);
      setError(t('duplicatePhoneError'));
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: EMAIL_CONFIRM_REDIRECT_URL,
        // Defensive fallback for when this project requires email
        // confirmation (which it now always does — see the phone-login
        // migration's follow-up notes): there's no session yet below to
        // run the profiles UPDATE with, so this is the only way full_name/
        // role/preferred_language/phone reach the profiles row (via
        // handle_new_user reading them off signup metadata — see
        // supabase/migrations/20260821190552_profiles.sql and
        // 20260828091441_phone_survives_email_confirmation.sql) before the
        // user confirms and signs in for the first time. `language` here
        // is whatever's currently selected in LanguageContext — including
        // a pre-auth toggle on the welcome screen (app/(auth)/index.tsx)
        // — not a hardcoded default, so that choice actually persists
        // instead of silently reverting to 'bn' once the account exists.
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
      // Surface Supabase's own message (e.g. "User already registered")
      // rather than a generic one.
      setError(signUpError.message);
      return;
    }

    // Shows the onboarding carousel once, the first time this account
    // actually lands in the app — see lib/onboarding-storage.ts for why
    // that's keyed by user id and persisted rather than an in-memory
    // flag (this project requires email confirmation, so "immediately
    // after sign-up" is almost always a separate later sign-in, not this
    // same request). Marked regardless of whether data.session exists
    // below, since either way this is a genuinely new account.
    if (data.user) {
      markOnboardingPending(data.user.id);
    }

    if (!data.session) {
      // Email confirmation is required by this Supabase project — there's
      // no authenticated session yet, so the profiles UPDATE below would be
      // rejected by RLS (profiles_update_own requires auth.uid() = id).
      // full_name/role/preferred_language/phone were all still captured
      // via signup metadata above (handle_new_user).
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
      // profiles_phone_normalized_key (see the phone-login migration)
      // rejects a phone number already used by another account — give a
      // specific, actionable message instead of Supabase's raw
      // constraint-violation text.
      setError(
        profileError.code === PHONE_UNIQUE_VIOLATION
          ? t('duplicatePhoneError')
          : profileError.message
      );
      return;
    }

    // No navigation call needed: the session change is picked up by
    // AuthProvider, and Stack.Protected in the root layout redirects to the
    // (tabs) group automatically.
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // See components/SettingsScreen.tsx's comment for the full
      // investigation: on Android, KeyboardAvoidingView unconditionally
      // triggers LayoutAnimation on every keyboard show/hide event
      // regardless of `behavior`, which can knock a focused TextInput out
      // of focus and cause a show/hide loop. enabled={false} on Android
      // doesn't change this component's rendered output there at all, so
      // this is safe everywhere it's used.
      enabled={Platform.OS === 'ios'}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.container, { paddingBottom: keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{heading}</Text>

        <TextInput
          ref={fullNameInputRef}
          style={styles.input}
          placeholder={t('fullNamePlaceholder')}
          autoCapitalize="words"
          autoComplete="name"
          value={fullName}
          onChangeText={setFullName}
          onFocus={() => scrollInputIntoView(scrollViewRef.current, fullNameInputRef)}
        />
        <TextInput
          ref={emailInputRef}
          style={styles.input}
          placeholder={t('emailPlaceholder')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          onFocus={() => scrollInputIntoView(scrollViewRef.current, emailInputRef)}
        />
        <TextInput
          ref={phoneInputRef}
          style={styles.input}
          placeholder={t('phonePlaceholder')}
          autoComplete="tel"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          onFocus={() => scrollInputIntoView(scrollViewRef.current, phoneInputRef)}
        />
        <PasswordInput
          inputRef={passwordInputRef}
          placeholder={t('passwordSignupPlaceholder')}
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
          onFocus={() => scrollInputIntoView(scrollViewRef.current, passwordInputRef)}
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {info && <Text style={styles.info}>{info}</Text>}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('signUpButton')}</Text>
          )}
        </Pressable>

        <Link href={{ pathname: '/(auth)/sign-in', params: { role } }} style={styles.link}>
          {t('signInLink')}
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
  info: {
    color: '#1a7f37',
    fontSize: 14,
  },
  link: {
    textAlign: 'center',
    marginTop: 16,
    color: '#2f95dc',
    fontSize: 14,
  },
});
