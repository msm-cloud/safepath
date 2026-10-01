import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View, type ScrollView, type TextInput } from 'react-native';

import AuthHeader from '@/components/AuthHeader';
import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { phoneReset } from '@/lib/auth-identifier';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { isValidEmail, isValidPhone } from '@/lib/validation';
import { useTheme } from '@/theme';

// Deep link the reset email points at — see app/reset-password.tsx (a
// top-level, unguarded route, not under (auth), so the incoming recovery
// session isn't interrupted by Stack.Protected — see that file's own
// comment for why).
const RESET_PASSWORD_REDIRECT_URL = 'safepath://reset-password';

export default function ForgotPasswordScreen() {
  const { t } = useLanguage();
  const { spacing } = useTheme();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const identifierRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    setError(null);

    const trimmed = identifier.trim();
    if (!isValidEmail(trimmed) && !isValidPhone(trimmed)) {
      setError(t('invalidEmailOrPhone'));
      return;
    }

    setSubmitting(true);

    // Supabase Auth doesn't reveal whether an email has an account, and
    // the edge function doesn't reveal whether a phone does, so every
    // outcome except rate limiting shows the same "sent" message.
    if (isValidEmail(trimmed)) {
      await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: RESET_PASSWORD_REDIRECT_URL,
      });
    } else {
      const result = await phoneReset(trimmed, RESET_PASSWORD_REDIRECT_URL);
      if (result.kind === 'rate_limited') {
        setSubmitting(false);
        setError(t('tooManyAttempts'));
        return;
      }
    }

    setSubmitting(false);
    setSent(true);
  };

  return (
    <Screen background="auth" scrollRef={scrollRef} contentStyle={{ gap: spacing.xl }}>
      <AuthHeader leading="back" />

      <View style={{ gap: spacing.sm }}>
        <Text variant="display" accessibilityRole="header">
          {t('forgotPasswordTitle')}
        </Text>
        <Text>{t('forgotPasswordSubtitle')}</Text>
      </View>

      {sent ? (
        <Banner tone="success" message={t('resetLinkSentMessage')} />
      ) : (
        <View style={{ gap: spacing.lg }}>
          <Input
            ref={identifierRef}
            label={t('identifierLabel')}
            autoCapitalize="none"
            autoComplete="username"
            keyboardType="default"
            returnKeyType="send"
            value={identifier}
            onChangeText={setIdentifier}
            onFocus={() => scrollInputIntoView(scrollRef.current, identifierRef)}
            onSubmitEditing={handleSubmit}
          />
          {error && <Banner tone="danger" message={error} />}
        </View>
      )}

      <View style={{ marginTop: 'auto', gap: spacing.md }}>
        {!sent && (
          <Button
            title={t('sendResetLinkButton')}
            loading={submitting}
            loadingTitle={t('sendingLabel')}
            onPress={handleSubmit}
          />
        )}
        <Button
          title={t('backToSignInLink')}
          variant={sent ? 'ink' : 'ghost'}
          onPress={() => router.dismissTo('/(auth)/sign-in')}
        />
      </View>
    </Screen>
  );
}
