import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';

const PAST_ALERTS_LIMIT = 20;

type PastAlert = {
  id: string;
  full_name: string;
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

  const [alerts, setAlerts] = useState<PastAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select(
        'id, created_at, resolved_at, last_lat, last_lng, trigger_type, user:profiles!alerts_user_id_fkey(full_name)'
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
      user: { full_name: string } | null;
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
      }))
    );
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- same fetch-on-mount pattern as (tabs)/contacts.tsx and (tabs)/emergency-contacts.tsx; see their comments for why this is deliberate.
    fetchAlerts().finally(() => setLoading(false));
  }, [fetchAlerts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>{t('guardianPastAlertsTitle')}</Text>
            {listError && <Text style={styles.error}>{listError}</Text>}
            {loading && <ActivityIndicator style={styles.loadingIndicator} />}
            {!loading && !listError && alerts.length === 0 && (
              <Text style={styles.emptyState}>{t('noResolvedAlertsYet')}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.trigger_type === 'journey_overdue' && (
              <Text style={styles.rowLabel}>{t('missedCheckinTypeLabel')}</Text>
            )}
            <Text style={styles.rowName}>{item.full_name}</Text>
            <Text style={styles.rowMeta}>
              {new Date(item.created_at).toLocaleString()}
              {item.resolved_at ? ` — ${formatDuration(item.created_at, item.resolved_at, t)}` : ''}
            </Text>
            {item.last_lat != null && item.last_lng != null ? (
              <Pressable
                onPress={() =>
                  Linking.openURL(`https://www.google.com/maps?q=${item.last_lat},${item.last_lng}`)
                }
              >
                <Text style={styles.link}>{t('viewLastKnownLocationLink')}</Text>
              </Pressable>
            ) : (
              <Text style={styles.noLocation}>{t('noLocationRecorded')}</Text>
            )}
          </View>
        )}
      />
    </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  error: {
    color: '#d33',
    fontSize: 14,
  },
  loadingIndicator: {
    marginTop: 12,
  },
  emptyState: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    gap: 2,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: '#a3730a',
    textTransform: 'uppercase',
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowMeta: {
    fontSize: 13,
    color: '#666',
  },
  link: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: '#2f95dc',
  },
  noLocation: {
    marginTop: 2,
    fontSize: 13,
    color: '#999',
  },
});
