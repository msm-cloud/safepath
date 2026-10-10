import * as Clipboard from 'expo-clipboard';
import { useRef, useState, type RefObject } from 'react';
import { ActivityIndicator, Share, View, type ScrollView, type TextInput } from 'react-native';

import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import {
  cancelGuardianRequest,
  createGuardianRequest,
  type GuardianRequestSummary,
} from '@/lib/guardian-requests';
import { formatInviteCode, inviteCodeExpiresAt, normalizeInviteCode } from '@/lib/invite-code';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';
import { useGuardianRequests } from '@/lib/use-guardian-requests';
import { useInputScroll } from '@/lib/use-input-scroll';
import { useTheme } from '@/theme';

// Mirrors the 3-at-once cap in create_guardian_request.
const MAX_WAITING_CODES = 3;
const RECENT_INACTIVE_SHOWN = 5;

// redeem_guardian_invite returns jsonb, which the generated Supabase types
// can't know the shape of — this is the shape it actually returns, per
// supabase/migrations/20261002060000_unique_accepted_guardian_link.sql.
type RedeemResult =
  | { success: true; user_id: string; user_name: string | null }
  | { success: false; error: 'invalid_or_used_code' | 'already_linked' | 'not_authenticated' };

const REDEEM_ERROR_KEYS: Record<string, TranslationKey> = {
  invalid_or_used_code: 'invalidOrUsedCode',
  already_linked: 'alreadyLinkedCode',
  // Shouldn't happen — this screen is only reachable while signed in — but
  // handle it rather than showing a raw/confusing message if it does.
  not_authenticated: 'sessionExpired',
};

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function expiryTime(createdAt: string): string {
  return inviteCodeExpiresAt(createdAt).toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// The guardian creates a short-lived code and shares it; the family member
// enters it in SafePath and accepts or declines. The guardian only sees
// "waiting" or "no longer active", whatever happened.
export default function GuardianInviteScreen() {
  const { t } = useLanguage();
  const { spacing } = useTheme();
  const { requests, loading, loadFailed, refresh } = useGuardianRequests();

  const [creating, setCreating] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const waiting = requests.filter((request) => request.state === 'waiting');
  const inactive = requests
    .filter((request) => request.state === 'inactive')
    .slice(0, RECENT_INACTIVE_SHOWN);
  // The list is newest first; the newest waiting code is the one to share.
  const current = waiting[0] ?? null;
  const atCap = waiting.length >= MAX_WAITING_CODES;

  const handleCreate = async () => {
    setError(null);
    setCreating(true);
    const result = await createGuardianRequest();
    if (result.kind === 'ok') await refresh();
    setCreating(false);
    setCopied(false);
    if (result.kind === 'too_many_waiting') setError(t('tooManyWaitingCodes'));
    else if (result.kind === 'daily_limit') setError(t('dailyCodeLimit'));
    else if (result.kind === 'error') setError(t('inviteActionFailed'));
  };

  const handleCancel = async (request: GuardianRequestSummary) => {
    setError(null);
    setCancellingId(request.id);
    const ok = await cancelGuardianRequest(request.id);
    await refresh();
    setCancellingId(null);
    if (!ok) setError(t('inviteActionFailed'));
  };

  const handleCopy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
  };

  const handleShare = async (code: string) => {
    await Share.share({ message: t('guardianShareCodeMessage', { code: formatInviteCode(code) }) });
  };

  return (
    <Screen edges={[]} scrollRef={scrollRef} contentStyle={{ gap: spacing.xl }}>
      {loadFailed && <Banner tone="danger" message={t('inviteListLoadFailed')} />}
      {error && <Banner tone="danger" message={error} />}

      {loading ? (
        <ActivityIndicator />
      ) : current ? (
        <Card>
          <View style={{ gap: spacing.md }}>
            <Text variant="label" color="textSecondary">
              {t('inviteCodeTitle')}
            </Text>
            <Text
              variant="display"
              script="latin"
              selectable
              accessibilityLabel={current.code.split('').join(' ')}
            >
              {formatInviteCode(current.code)}
            </Text>
            <Text variant="bodySm" color="textSecondary">
              {t('guardianCodeHint', { time: expiryTime(current.createdAt) })}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={t('shareCodeButton')}
                  variant="primary"
                  icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                  onPress={() => handleShare(current.code)}
                />
              </View>
              <Button
                title={copied ? t('copiedButton') : t('copyButton')}
                variant="secondary"
                fullWidth={false}
                onPress={() => handleCopy(current.code)}
              />
            </View>
          </View>
        </Card>
      ) : (
        <View style={{ gap: spacing.lg }}>
          <Text color="textSecondary">{t('guardianInviteIntro')}</Text>
          <Button
            title={t('createInviteCodeButton')}
            icon={{ ios: 'plus', android: 'add', web: 'add' }}
            loading={creating}
            loadingTitle={t('creatingInviteCode')}
            onPress={handleCreate}
          />
        </View>
      )}

      <Card variant="muted">
        <View style={{ gap: spacing.xs }}>
          <Text variant="label">{t('howItWorksTitle')}</Text>
          <Text variant="bodySm" color="textSecondary">
            {t('guardianHowItWorksBody')}
          </Text>
        </View>
      </Card>

      {waiting.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color="textSecondary">
            {t('waitingCodesLabel')}
          </Text>
          {waiting.map((request) => (
            <Card key={request.id} padding="md">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text variant="title" script="latin">
                    {formatInviteCode(request.code)}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {t('waitingCodeMeta', { time: clockTime(request.createdAt) })}
                  </Text>
                </View>
                <Button
                  title={t('cancelCodeButton')}
                  accessibilityLabel={t('cancelCodeLabel', { code: request.code })}
                  variant="dangerOutline"
                  size="small"
                  fullWidth={false}
                  loading={cancellingId === request.id}
                  onPress={() => handleCancel(request)}
                />
              </View>
            </Card>
          ))}
          {atCap ? (
            <Text variant="caption" color="textMuted">
              {t('tooManyWaitingCodes')}
            </Text>
          ) : (
            <Button
              title={t('createAnotherCodeButton')}
              variant="secondary"
              icon={{ ios: 'plus', android: 'add', web: 'add' }}
              loading={creating}
              loadingTitle={t('creatingInviteCode')}
              onPress={handleCreate}
            />
          )}
        </View>
      )}

      {inactive.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color="textSecondary">
            {t('inactiveCodesLabel')}
          </Text>
          {inactive.map((request) => (
            <Text key={request.id} variant="bodySm" color="textMuted">
              {t('inactiveCodeMeta', { code: formatInviteCode(request.code) })}
            </Text>
          ))}
        </View>
      )}

      <OlderAppCodeEntry scrollRef={scrollRef} />
    </Screen>
  );
}

// A family member still on 1.1/1.2 creates the code on their side, so the
// guardian redeems it here. Removed with the old flow (see
// docs/plans/guardian-invite-requests.md, "Older apps").
function OlderAppCodeEntry({ scrollRef }: { scrollRef: RefObject<ScrollView | null> }) {
  const { t } = useLanguage();
  const { spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const codeRef = useRef<TextInput>(null);
  const { onInputFocus, onInputBlur } = useInputScroll(scrollRef);

  if (!open) {
    return <Button title={t('olderAppCodeToggle')} variant="ghost" onPress={() => setOpen(true)} />;
  }

  const handleSubmit = async () => {
    setError(null);
    setConfirmation(null);

    const normalized = normalizeInviteCode(code);
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
      setError(t('inviteActionFailed'));
      return;
    }

    const result = data as unknown as RedeemResult;
    if (!result.success) {
      const key = REDEEM_ERROR_KEYS[result.error];
      setError(key ? t(key) : t('inviteActionFailed'));
      return;
    }

    setCode('');
    setConfirmation(t('nowLinkedTo', { name: result.user_name ?? t('thisUserFallback') }));
  };

  return (
    <Card variant="muted">
      <View style={{ gap: spacing.md }}>
        <Text variant="label">{t('olderAppCodeToggle')}</Text>
        <Text variant="bodySm" color="textSecondary">
          {t('olderAppCodeHint')}
        </Text>
        <Input
          ref={codeRef}
          label={t('inviteCodeLabel')}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
          onFocus={() => onInputFocus(codeRef)}
          onBlur={() => onInputBlur(codeRef)}
          onSubmitEditing={handleSubmit}
        />
        {error && <Banner tone="danger" message={error} />}
        {confirmation && <Banner tone="success" message={confirmation} />}
        <Button
          title={t('linkButton')}
          variant="secondary"
          loading={submitting}
          loadingTitle={t('linkingButton')}
          onPress={handleSubmit}
        />
      </View>
    </Card>
  );
}
