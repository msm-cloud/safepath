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
import type { TranslationKey } from '@/lib/translations';

// redeem_guardian_invite returns jsonb, which the generated Supabase types
// can't know the shape of — this is the shape it actually returns, per
// supabase/migrations/20260821192936_fix_guardian_links_invite_leak.sql
// (already built and tested there — this screen just calls it, same as
// dashboard/app/dashboard/redeem-invite-form.tsx does).
type RedeemResult =
  | { success: true; user_id: string; user_name: string | null }
  | { success: false; error: 'invalid_or_used_code' | 'not_authenticated' };

const ERROR_KEYS: Record<string, TranslationKey> = {
  invalid_or_used_code: 'invalidOrUsedCode',
  // Shouldn't happen — this screen is only reachable while signed in — but
  // handle it rather than showing a raw/confusing message if it does.
  not_authenticated: 'sessionExpired',
};

export default function LinkToSomeoneScreen() {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setConfirmation(null);

    const trimmed = code.trim();
    if (trimmed.length === 0) {
      setError(t('enterInviteCode'));
      return;
    }

    setSubmitting(true);
    const { data, error: rpcError } = await supabase.rpc('redeem_guardian_invite', {
      p_invite_code: trimmed,
    });
    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const result = data as unknown as RedeemResult;

    if (!result.success) {
      const key = ERROR_KEYS[result.error];
      setError(key ? t(key) : result.error);
      return;
    }

    setCode('');
    setConfirmation(t('nowLinkedTo', { name: result.user_name ?? t('thisUserFallback') }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('guardianLinkTitle')}</Text>
        <Text style={styles.subtitle}>{t('guardianLinkSubtitle')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('inviteCodePlaceholder')}
          autoCapitalize="characters"
          autoCorrect={false}
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {confirmation && <Text style={styles.confirmation}>{confirmation}</Text>}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('linkButton')}</Text>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 3,
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
  confirmation: {
    color: '#1a7f37',
    fontSize: 14,
    textAlign: 'center',
  },
});
