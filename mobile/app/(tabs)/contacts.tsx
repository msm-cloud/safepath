import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  Share,
  View,
  type ScrollView,
  type TextInput,
} from 'react-native';

import OlderAppGuardianInvite, { type PendingCode } from '@/components/OlderAppGuardianInvite';
import Avatar from '@/components/ui/Avatar';
import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Screen from '@/components/ui/Screen';
import SegmentedControl from '@/components/ui/SegmentedControl';
import Text from '@/components/ui/Text';
import { useAuth } from '@/lib/auth-context';
import { claimGuardianRequest, rememberClaimedRequest } from '@/lib/guardian-requests';
import { isInviteCodeExpired, normalizeInviteCode } from '@/lib/invite-code';
import { useLanguage } from '@/lib/language-context';
import {
  DEFAULT_RETENTION_HOURS,
  RETENTION_PRESETS_HOURS,
  retentionLabelKey,
} from '@/lib/location-history-retention';
import { supabase } from '@/lib/supabase';
import { localizeDigits } from '@/lib/translations';
import { useInputScroll } from '@/lib/use-input-scroll';
import { useMyGuardianRequests } from '@/lib/use-my-guardian-requests';
import { useTheme } from '@/theme';

type GuardianLinkRow = {
  id: string;
  status: 'pending' | 'accepted' | 'revoked';
  invite_code: string;
  created_at: string;
  guardian_id: string | null;
  guardian: { full_name: string; avatar_url: string | null } | null;
};

// retention_hours per guardian_id, for the "how long each guardian keeps
// my recorded location history" control shown under accepted links. Either
// party can change this (see location_history_retention RLS); a guardian
// changing it shows up here on the student's next refresh.
type RetentionRow = { guardian_id: string; retention_hours: number };

export default function GuardiansScreen() {
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const { spacing } = useTheme();
  const router = useRouter();
  const userId = session?.user.id;
  const { requests, refresh: refreshRequests } = useMyGuardianRequests();

  const [links, setLinks] = useState<GuardianLinkRow[]>([]);
  const [retentionByGuardian, setRetentionByGuardian] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [checking, setChecking] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const codeRef = useRef<TextInput>(null);
  const { onInputFocus, onInputBlur } = useInputScroll(scrollRef);

  const fetchLinks = useCallback(async () => {
    if (!userId) return;

    // Revoked links are history only; nothing on this screen needs them.
    const { data, error: linksError } = await supabase
      .from('guardian_links')
      .select(
        'id, status, invite_code, created_at, guardian_id, guardian:profiles!guardian_links_guardian_id_fkey(full_name, avatar_url)'
      )
      .eq('user_id', userId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });

    if (linksError) {
      setError(t('guardianUpdateFailed'));
      return;
    }
    setError(null);
    // An expired code stays pending until the expiry job revokes it; it
    // can't be redeemed any more, so don't list it.
    setLinks(
      ((data ?? []) as GuardianLinkRow[]).filter(
        (link) => link.status !== 'pending' || !isInviteCodeExpired(link.created_at)
      )
    );

    const { data: retention } = await supabase
      .from('location_history_retention')
      .select('guardian_id, retention_hours')
      .eq('user_id', userId)
      .eq('recorded_by_role', 'user');
    setRetentionByGuardian(
      Object.fromEntries(
        ((retention ?? []) as RetentionRow[]).map((r) => [r.guardian_id, r.retention_hours])
      )
    );
  }, [userId, t]);

  // Refetch on focus so the list is current after accepting a request or
  // removing a guardian on their own screens.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchLinks().finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [fetchLinks])
  );

  const setRetention = async (guardianId: string, hours: number) => {
    if (!userId) return;
    // Optimistic, same fire-and-forget pattern the settings toggles use.
    setRetentionByGuardian((prev) => ({ ...prev, [guardianId]: hours }));
    await supabase.from('location_history_retention').upsert(
      {
        user_id: userId,
        guardian_id: guardianId,
        retention_hours: hours,
        recorded_by_role: 'user',
      },
      { onConflict: 'user_id,guardian_id,recorded_by_role' }
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLinks(), refreshRequests()]);
    setRefreshing(false);
  };

  // Asks a family member to install SafePath and send a code. Nothing is
  // created; linking starts from the guardian's side.
  const handleShareInvite = async () => {
    await Share.share({ message: t('inviteGuardianShareMessage') });
  };

  const handleCheckCode = async () => {
    setCodeError(undefined);
    const normalized = normalizeInviteCode(code);
    if (normalized.length === 0) {
      setCodeError(t('enterInviteCode'));
      return;
    }

    setChecking(true);
    const result = await claimGuardianRequest({ code: normalized });
    setChecking(false);

    switch (result.kind) {
      case 'ok':
        rememberClaimedRequest(result.request);
        setCode('');
        void refreshRequests();
        router.push({
          pathname: '/guardian-request',
          params: { requestId: result.request.requestId },
        });
        return;
      case 'not_available':
        setCodeError(t('inviteCodeInvalid'));
        return;
      case 'rate_limited':
        setCodeError(
          t('inviteCodeRateLimited', {
            n: localizeDigits(Math.max(1, Math.ceil(result.retryAfterSecs / 60)), language),
          })
        );
        return;
      case 'not_authenticated':
        setCodeError(t('sessionExpired'));
        return;
      case 'error':
        setCodeError(t('inviteActionFailed'));
    }
  };

  const guardians = links.filter((link) => link.status === 'accepted');
  const pendingCodes: PendingCode[] = links.filter((link) => link.status === 'pending');

  return (
    <Screen
      edges={[]}
      scrollRef={scrollRef}
      contentStyle={{ gap: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {error && <Banner tone="danger" message={error} />}

      <Button
        title={t('inviteGuardianButton')}
        variant="secondary"
        icon={{ ios: 'plus', android: 'add', web: 'add' }}
        onPress={handleShareInvite}
      />

      {requests.map((request) => {
        const name = request.guardianName || t('unnamedGuardian');
        return (
          <Card
            key={request.id}
            padding="md"
            selected
            accessibilityLabel={`${t('requestCardTitle', { name })}. ${t('reviewButton')}`}
            onPress={() =>
              router.push({ pathname: '/guardian-request', params: { requestId: request.id } })
            }
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={name} size={42} />
              <View style={{ flex: 1 }}>
                <Text variant="title">{t('requestCardTitle', { name })}</Text>
                <Text variant="caption" color="textSecondary">
                  {t('requestCardSubtitle')}
                </Text>
              </View>
              <Text variant="label" color="primary">
                {t('reviewButton')}
              </Text>
            </View>
          </Card>
        );
      })}

      <View style={{ gap: spacing.md }}>
        <Input
          ref={codeRef}
          label={t('haveInviteCodeLabel')}
          placeholder={t('inviteCodeExample')}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          value={code}
          error={codeError}
          onChangeText={(text) => setCode(text.toUpperCase())}
          onFocus={() => onInputFocus(codeRef)}
          onBlur={() => onInputBlur(codeRef)}
          onSubmitEditing={handleCheckCode}
        />
        <Button
          title={t('checkCodeButton')}
          loading={checking}
          loadingTitle={t('checkingCode')}
          onPress={handleCheckCode}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" color="textSecondary">
          {t('yourGuardiansCount', { n: guardians.length })}
        </Text>
        {loading && <ActivityIndicator />}
        {!loading && guardians.length === 0 && (
          <Text color="textSecondary">{t('noGuardiansYet')}</Text>
        )}
        {guardians.map((link) => {
          const guardianId = link.guardian_id;
          if (!guardianId) return null;
          const name = link.guardian?.full_name || t('unnamedGuardian');
          const retentionHours = retentionByGuardian[guardianId] ?? DEFAULT_RETENTION_HOURS;
          return (
            <Card key={link.id} padding="md">
              <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Avatar name={name} url={link.guardian?.avatar_url ?? null} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text variant="title">{name}</Text>
                    <Text variant="caption" color="textMuted">
                      {t('guardianLinkedMeta')}
                    </Text>
                  </View>
                  <Button
                    title={t('removeGuardianButton')}
                    accessibilityLabel={t('removeGuardianLabel', { name })}
                    variant="secondary"
                    size="small"
                    fullWidth={false}
                    onPress={() =>
                      router.push({ pathname: '/remove-guardian', params: { linkId: link.id } })
                    }
                  />
                </View>
                {/* How long this guardian keeps my recorded location
                    history. Either party can change it (see
                    location_history_retention RLS). */}
                <View style={{ gap: spacing.xs }}>
                  <Text variant="caption" color="textSecondary">
                    {t('locationHistoryRetentionLabel')}
                  </Text>
                  <SegmentedControl
                    accessibilityLabel={t('locationHistoryRetentionLabel')}
                    value={String(retentionHours)}
                    onChange={(value) => setRetention(guardianId, Number(value))}
                    options={RETENTION_PRESETS_HOURS.map((hours) => ({
                      value: String(hours),
                      label: t(retentionLabelKey(hours)),
                    }))}
                  />
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      {guardians.length > 0 && (
        <Button
          title={t('guardianLocationLink')}
          variant="ghost"
          onPress={() => router.push('/guardian-location')}
        />
      )}

      <OlderAppGuardianInvite pendingCodes={pendingCodes} onChanged={fetchLinks} />
    </Screen>
  );
}
