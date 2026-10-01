import { useRef, useState } from 'react';
import { View, type ScrollView, type TextInput } from 'react-native';

import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';
import { useTheme } from '@/theme';

// redeem_guardian_invite returns jsonb, which the generated Supabase types
// can't know the shape of — this is the shape it actually returns, per
// supabase/migrations/20260929200021_security_db_hardening.sql (the
// dashboard's redeem-invite-form.tsx calls it the same way).
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
  const { spacing } = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const codeRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    setError(null);
    setConfirmation(null);

    // The student's screen shows the code in two groups ("ABCD EFGH"), so
    // spaces and dashes typed along with it are dropped.
    const normalized = code.replace(/[\s-]/g, '');
    if (normalized.length === 0) {
      setError(t('enterInviteCode'));
      return;
    }

    setSubmitting(true);
    const { data, error: rpcError } = await supabase.rpc('redeem_guardian_invite', {
      p_invite_code: normalized,
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
    <Screen edges={[]} scrollRef={scrollRef} contentStyle={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="h2" accessibilityRole="header">
          {t('guardianLinkTitle')}
        </Text>
        <Text color="textSecondary">{t('guardianLinkSubtitle')}</Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Input
          ref={codeRef}
          label={t('inviteCodeLabel')}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
          onFocus={() => scrollInputIntoView(scrollRef.current, codeRef)}
          onSubmitEditing={handleSubmit}
        />
        {error && <Banner tone="danger" message={error} />}
        {confirmation && <Banner tone="success" message={confirmation} />}
      </View>

      <Button
        title={t('linkButton')}
        loading={submitting}
        loadingTitle={t('linkingButton')}
        onPress={handleSubmit}
      />
    </Screen>
  );
}
