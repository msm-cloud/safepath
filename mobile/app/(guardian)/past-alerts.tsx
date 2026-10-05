import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, View } from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import { useGuardianLinkRevoked } from '@/lib/use-guardian-link-revoked';
import type { TranslationKey } from '@/lib/translations';
import { useTheme } from '@/theme';

const PAST_ALERTS_LIMIT = 20;
const AVATAR_SIZE = 44;

type PastAlert = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  resolved_at: string | null;
  last_lat: number | null;
  last_lng: number | null;
  trigger_type: string;
};

// The mobile equivalent of dashboard/app/dashboard/past-alerts.tsx — same
// query pattern (resolved alerts, most recent first, capped at 20), but as
// a plain client-side fetch-on-mount rather than a Server Component, since
// there's no server-rendering layer here. Resolved alerts aren't
// time-critical the way active ones are, so — same as the dashboard —
// this deliberately isn't Realtime.
export default function GuardianPastAlertsScreen() {
  const { t } = useLanguage();
  const { spacing } = useTheme();

  const [alerts, setAlerts] = useState<PastAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select(
        'id, created_at, resolved_at, last_lat, last_lng, trigger_type, user:profiles!alerts_user_id_fkey(full_name, avatar_url)'
      )
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false })
      .limit(PAST_ALERTS_LIMIT);

    if (error) {
      setListError(error.message);
      return;
    }
    setListError(null);

    const rows = data as unknown as {
      id: string;
      created_at: string;
      resolved_at: string | null;
      last_lat: number | null;
      last_lng: number | null;
      trigger_type: string;
      user: { full_name: string; avatar_url: string | null } | null;
    }[];

    setAlerts(
      rows.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        resolved_at: row.resolved_at,
        last_lat: row.last_lat,
        last_lng: row.last_lng,
        trigger_type: row.trigger_type,
        full_name: row.user?.full_name || t('unnamedUser'),
        avatar_url: row.user?.avatar_url ?? null,
      }))
    );
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- same fetch-on-mount pattern as (tabs)/contacts.tsx and (tabs)/emergency-contacts.tsx; see their comments for why this is deliberate.
    fetchAlerts().finally(() => setLoading(false));
  }, [fetchAlerts]);

  // RLS hides a revoked student's alerts, so a refetch is enough.
  useGuardianLinkRevoked(() => {
    void fetchAlerts();
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  return (
    <Screen
      edges={[]}
      contentStyle={{ gap: spacing.md }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {listError && <Banner tone="danger" message={listError} />}
      {loading && <ActivityIndicator />}
      {!loading && !listError && alerts.length === 0 && (
        <EmptyState
          icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
          tone="success"
          title={t('noResolvedAlertsYet')}
        />
      )}
      {alerts.map((alert) => (
        <PastAlertCard key={alert.id} alert={alert} />
      ))}
    </Screen>
  );
}

function PastAlertCard({ alert }: { alert: PastAlert }) {
  const { t } = useLanguage();
  const { colors, radius, spacing } = useTheme();
  const hasLocation = alert.last_lat != null && alert.last_lng != null;

  return (
    <Card style={{ gap: spacing.md }}>
      {alert.trigger_type === 'journey_overdue' && (
        <View
          style={{
            alignSelf: 'flex-start',
            paddingVertical: spacing.xxs,
            paddingHorizontal: spacing.sm,
            borderRadius: radius.pill,
            backgroundColor: colors.warningSoft,
          }}
        >
          <Text variant="micro" color="onWarningSoft" style={{ textTransform: 'uppercase' }}>
            {t('missedCheckinTypeLabel')}
          </Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={alert.full_name} url={alert.avatar_url} size={AVATAR_SIZE} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="body" weight="semibold">
            {alert.full_name}
          </Text>
          <Text variant="caption" color="textMuted">
            {new Date(alert.created_at).toLocaleString()}
          </Text>
          {alert.resolved_at && (
            <Text variant="caption" color="textMuted">
              {formatDuration(alert.created_at, alert.resolved_at, t)}
            </Text>
          )}
        </View>
      </View>
      {hasLocation ? (
        <Button
          title={t('viewLastKnownLocationLink')}
          variant="secondary"
          size="small"
          icon={{ ios: 'map', android: 'map', web: 'map' }}
          onPress={() =>
            Linking.openURL(`https://www.google.com/maps?q=${alert.last_lat},${alert.last_lng}`)
          }
        />
      ) : (
        <Text variant="caption" color="textMuted">
          {t('noLocationRecorded')}
        </Text>
      )}
    </Card>
  );
}

// e.g. "Active for 12 minutes" / "Active for 2h 5m" / "Active for 3 days" —
// same shape as the dashboard's formatDuration in past-alerts.tsx.
function formatDuration(
  startIso: string,
  endIso: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalMinutes = Math.max(0, Math.round(ms / 60000));

  if (totalMinutes < 1) return t('activeForLessThanMinute');
  if (totalMinutes < 60) {
    return t('activeForMinutes', { n: totalMinutes, s: totalMinutes === 1 ? '' : 's' });
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes > 0
      ? t('activeForHoursMinutes', { h: hours, m: minutes })
      : t('activeForHours', { h: hours, s: hours === 1 ? '' : 's' });
  }

  const days = Math.floor(hours / 24);
  return t('activeForDays', { d: days, s: days === 1 ? '' : 's' });
}
