import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import {
  acceptGuardianRequest,
  claimGuardianRequest,
  declineGuardianRequest,
  takeClaimedRequest,
  type ClaimedRequest,
  type DecideResult,
} from '@/lib/guardian-requests';
import { formatInviteCode } from '@/lib/invite-code';
import { useLanguage } from '@/lib/language-context';
import type { TranslationKey } from '@/lib/translations';
import { useTheme } from '@/theme';

// What a guardian gets once linked; keep in step with the guardian
// features and the removal screen's consequences.
const PERMISSIONS: { icon: SymbolViewProps['name']; key: TranslationKey }[] = [
  {
    icon: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
    key: 'requestWillSos',
  },
  {
    icon: { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' },
    key: 'requestWillJourneys',
  },
  {
    icon: { ios: 'location', android: 'location_on', web: 'location_on' },
    key: 'requestWillLive',
  },
  {
    icon: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
    key: 'requestWillHistory',
  },
];

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; request: ClaimedRequest }
  | { kind: 'gone' }
  | { kind: 'failed' };

// The student's review of a guardian's request: who is asking, what they
// will be able to do, and an explicit accept or decline. Leaving without
// deciding keeps the request on the Guardians tab until it expires.
export default function GuardianRequestScreen() {
  const { t } = useLanguage();
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  // A hidden tab screen: back would follow the tab history, so return to
  // the Guardians tab explicitly.
  const backToGuardians = useCallback(() => router.navigate('/contacts'), [router]);

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [deciding, setDeciding] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    // Right after a claim the details are already here; a later visit
    // fetches them again, with a fresh photo link.
    const claimed = takeClaimedRequest(id);
    if (claimed) {
      setState({ kind: 'ready', request: claimed });
      return;
    }
    setState({ kind: 'loading' });
    const result = await claimGuardianRequest({ requestId: id });
    if (result.kind === 'ok') setState({ kind: 'ready', request: result.request });
    else if (result.kind === 'not_available') setState({ kind: 'gone' });
    else setState({ kind: 'failed' });
  }, []);

  // Tab screens stay mounted, so every visit loads again rather than
  // showing what was there last time.
  useFocusEffect(
    useCallback(() => {
      if (!requestId) {
        backToGuardians();
        return;
      }
      setError(null);
      void load(requestId);
    }, [requestId, load, backToGuardians])
  );

  const handleDecision = async (decision: 'accept' | 'decline') => {
    if (state.kind !== 'ready') return;
    setError(null);
    setDeciding(decision);
    const decide = decision === 'accept' ? acceptGuardianRequest : declineGuardianRequest;
    const result: DecideResult = await decide(state.request.requestId);
    setDeciding(null);
    if (result === 'ok') backToGuardians();
    else if (result === 'not_available') setState({ kind: 'gone' });
    else setError(t('inviteActionFailed'));
  };

  if (state.kind === 'loading') {
    return (
      <Screen edges={[]} contentStyle={{ justifyContent: 'center' }}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (state.kind !== 'ready') {
    return (
      <Screen edges={['bottom']} contentStyle={{ gap: spacing.xl }}>
        <Banner
          tone={state.kind === 'gone' ? 'info' : 'danger'}
          message={t(state.kind === 'gone' ? 'requestNoLongerActive' : 'requestLoadFailed')}
          action={
            state.kind === 'failed' && requestId
              ? { label: t('tryAgainButton'), onPress: () => void load(requestId) }
              : undefined
          }
        />
        <Button title={t('backToGuardiansButton')} variant="secondary" onPress={backToGuardians} />
      </Screen>
    );
  }

  const { request } = state;
  const name = request.guardianName || t('unnamedGuardian');
  const code = formatInviteCode(request.code);

  return (
    <Screen edges={['bottom']} contentStyle={{ gap: spacing.xl }}>
      <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }}>
        <Avatar name={name} signedUrl={request.avatarUrl} size={72} />
        <Text variant="h2" align="center" accessibilityRole="header">
          {t('requestCardTitle', { name })}
        </Text>
        <Text color="textSecondary" align="center">
          {request.phoneLast2
            ? t('requestCodePhoneLine', { code, digits: request.phoneLast2 })
            : t('requestCodeLine', { code })}
        </Text>
      </View>

      <Card>
        <View style={{ gap: spacing.md }}>
          <Text variant="label">{t('requestWillTitle', { name })}</Text>
          {PERMISSIONS.map(({ icon, key }) => (
            <View key={key} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <SymbolView name={icon} tintColor={colors.textSecondary} size={22} />
              <Text style={{ flex: 1 }}>{t(key)}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text color="textSecondary">{t('requestPressureNote')}</Text>

      {error && <Banner tone="danger" message={error} />}

      <View style={{ marginTop: 'auto', gap: spacing.md }}>
        <Button
          title={t('acceptGuardianButton', { name })}
          variant="primary"
          loading={deciding === 'accept'}
          loadingTitle={t('acceptingRequest')}
          disabled={deciding === 'decline'}
          onPress={() => handleDecision('accept')}
        />
        <Button
          title={t('declineRequestButton')}
          variant="secondary"
          loading={deciding === 'decline'}
          loadingTitle={t('decliningRequest')}
          disabled={deciding === 'accept'}
          onPress={() => handleDecision('decline')}
        />
      </View>
    </Screen>
  );
}
