import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import Avatar from '@/components/Avatar';
import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { revokeGuardianLink } from '@/lib/guardian-links';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';
import { useTheme } from '@/theme';

type Guardian = { name: string; avatarUrl: string | null };

const CONSEQUENCES: { icon: SymbolViewProps['name']; key: TranslationKey }[] = [
  {
    icon: { ios: 'bell.slash', android: 'notifications_off', web: 'notifications_off' },
    key: 'removeGuardianStopsAlerts',
  },
  {
    icon: { ios: 'location.slash', android: 'location_off', web: 'location_off' },
    key: 'removeGuardianStopsLocation',
  },
];

// Confirmation before revoking a link from the Guardians tab. The guardian
// is not told who removed them; their app just stops showing this student.
export default function RemoveGuardianScreen() {
  const { t } = useLanguage();
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { linkId } = useLocalSearchParams<{ linkId?: string }>();
  // A hidden tab screen: back would follow the tab history, so return to
  // the Guardians tab explicitly.
  const backToGuardians = () => router.navigate('/contacts');

  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!linkId) {
      router.navigate('/contacts');
      return;
    }
    let cancelled = false;
    (async () => {
      // Read from the database rather than trusting a name in the route.
      const { data } = await supabase
        .from('guardian_links')
        .select('guardian:profiles!guardian_links_guardian_id_fkey(full_name, avatar_url)')
        .eq('id', linkId)
        .eq('status', 'accepted')
        .maybeSingle();
      if (cancelled) return;
      const row = data as unknown as {
        guardian: { full_name: string; avatar_url: string | null } | null;
      } | null;
      if (!row) {
        router.navigate('/contacts');
        return;
      }
      setGuardian({
        name: row.guardian?.full_name || t('unnamedGuardian'),
        avatarUrl: row.guardian?.avatar_url ?? null,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [linkId, router, t]);

  const handleRemove = async () => {
    if (!linkId) return;
    setError(null);
    setRemoving(true);
    const ok = await revokeGuardianLink(linkId);
    setRemoving(false);
    if (!ok) {
      setError(t('guardianUpdateFailed'));
      return;
    }
    backToGuardians();
  };

  if (loading || !guardian) {
    return (
      <Screen edges={[]} contentStyle={{ justifyContent: 'center' }}>
        <ActivityIndicator />
      </Screen>
    );
  }

  const { name } = guardian;

  return (
    <Screen edges={['bottom']} contentStyle={{ gap: spacing.xl }}>
      <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }}>
        <Avatar name={name} url={guardian.avatarUrl} size={72} />
        <Text variant="h2" align="center" accessibilityRole="header">
          {t('removeGuardianTitle', { name })}
        </Text>
      </View>

      <Card>
        <View style={{ gap: spacing.md }}>
          {CONSEQUENCES.map(({ icon, key }) => (
            <View key={key} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <SymbolView name={icon} tintColor={colors.textSecondary} size={22} />
              <Text style={{ flex: 1 }}>{t(key, { name })}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text color="textSecondary">{t('removeGuardianRelink')}</Text>

      {error && <Banner tone="danger" message={error} />}

      <View style={{ marginTop: 'auto', gap: spacing.md }}>
        <Button
          title={t('removeGuardianConfirm')}
          variant="danger"
          loading={removing}
          loadingTitle={t('removingGuardian')}
          onPress={handleRemove}
        />
        <Button
          title={t('keepGuardianButton', { name })}
          variant="secondary"
          disabled={removing}
          onPress={backToGuardians}
        />
      </View>
    </Screen>
  );
}
