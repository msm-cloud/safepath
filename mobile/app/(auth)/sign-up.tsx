import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '@/lib/validation';

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
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('passwordTooShort', { n: MIN_PASSWORD_LENGTH }));
      return;
    }

    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Defensive fallback for when this project requires email
        // confirmation: there's no session yet below to run the profiles
        // UPDATE with, so this is the only way full_name/role/
        // preferred_language reach the profiles row (via handle_new_user
        // reading them off signup metadata — see
        // supabase/migrations/20260821190552_profiles.sql, which already
        // reads all three this way) before the user confirms and signs in
        // for the first time. `language` here is whatever's currently
        // selected in LanguageContext — including a pre-auth toggle on the
        // welcome screen (app/(auth)/index.tsx) — not a hardcoded default,
        // so that choice actually persists instead of silently reverting
        // to 'bn' once the account exists.
        data: { full_name: fullName.trim(), role, preferred_language: language },
      },
    });

    if (signUpError) {
      setSubmitting(false);
      // Surface Supabase's own message (e.g. "User already registered")
      // rather than a generic one.
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      // Email confirmation is required by this Supabase project — there's
      // no authenticated session yet, so the profiles UPDATE below would be
      // rejected by RLS (profiles_update_own requires auth.uid() = id).
      // full_name was still captured via signup metadata above.
      setSubmitting(false);
      setInfo(t('checkEmailConfirm'));
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role,
        full_name: fullName.trim(),
        preferred_language: language,
      })
      .eq('id', data.session.user.id);

    setSubmitting(false);

    if (profileError) {
      setError(profileError.message);
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
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{heading}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('fullNamePlaceholder')}
          autoCapitalize="words"
          autoComplete="name"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder={t('emailPlaceholder')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder={t('passwordSignupPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
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
