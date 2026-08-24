import { Link } from 'expo-router';
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

export default function SignInScreen() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    setError(null);

    if (!isValidEmail(email)) {
      setError(t('invalidEmail'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('passwordTooShort', { n: MIN_PASSWORD_LENGTH }));
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (signInError) {
      // Surface Supabase's own message (e.g. "Invalid login credentials")
      // rather than a generic one.
      setError(signInError.message);
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
        <Text style={styles.title}>{t('signInTitle')}</Text>

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
          placeholder={t('passwordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

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

        <Link href="/(auth)/sign-up" style={styles.link}>
          {t('signUpLink')}
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
  link: {
    textAlign: 'center',
    marginTop: 16,
    color: '#2f95dc',
    fontSize: 14,
  },
});
