import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import {
  DEFAULT_RETENTION_HOURS,
  RETENTION_PRESETS_HOURS,
  retentionLabelKey,
} from '@/lib/location-history-retention';
import { supabase } from '@/lib/supabase';

// Student counterpart to app/(guardian)/location-history.tsx — the saved
// location-history trail for each guardian who has their own "Share My
// Location" turned on (app/(guardian)/share-location.tsx). Same
// list/expand shape as the guardian's screen, reversed: here `user_id` in
// guardian_links is the caller (this student) and `guardian_id` is the
// person being viewed. The trail query relies on the reverse-direction
// RLS policy (location_history_points_select_user_reads_guardian_in_window)
// added alongside the forward one — see
// supabase/migrations/20260922155435_reciprocal_location_history.sql.
// Reached from the Guardians tab, not its own tab bar entry — href: null
// in app/(tabs)/_layout.tsx.

const TRAIL_LIMIT = 200;

type LinkedGuardian = {
  linkId: string;
  guardianId: string;
  fullName: string;
  avatarUrl: string | null;
  sharing: boolean;
};

type TrailPoint = { id: string; lat: number; lng: number; recorded_at: string };

export default function GuardianLocationScreen() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const userId = session?.user.id;

  const [guardians, setGuardians] = useState<LinkedGuardian[]>([]);
  const [retentionByGuardian, setRetentionByGuardian] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Per-guardian expanded trail — only one open at a time.
  const [openGuardianId, setOpenGuardianId] = useState<string | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);

  const loadTrail = useCallback(async (guardianId: string) => {
    setTrailLoading(true);
    const { data } = await supabase
      .from('location_history_points')
      .select('id, lat, lng, recorded_at')
      .eq('user_id', guardianId)
      .order('recorded_at', { ascending: false })
      .limit(TRAIL_LIMIT);
    setTrail((data ?? []) as TrailPoint[]);
    setTrailLoading(false);
  }, []);

  const fetchLinks = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('guardian_links')
      .select(
        'id, guardian_id, guardian:profiles!guardian_links_guardian_id_fkey(full_name, avatar_url, location_history_enabled)'
      )
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false });

    if (error) {
      setListError(error.message);
      return;
    }
    setListError(null);

    const rows = data as unknown as {
      id: string;
      guardian_id: string | null;
      guardian: {
        full_name: string;
        avatar_url: string | null;
        location_history_enabled: boolean;
      } | null;
    }[];

    setGuardians(
      rows
        .filter((r): r is typeof r & { guardian_id: string } => r.guardian_id !== null)
        .map((r) => ({
          linkId: r.id,
          guardianId: r.guardian_id,
          fullName: r.guardian?.full_name || t('unnamedUser'),
          avatarUrl: r.guardian?.avatar_url ?? null,
          sharing: r.guardian?.location_history_enabled ?? false,
        }))
    );

    const { data: retention } = await supabase
      .from('location_history_retention')
      .select('guardian_id, retention_hours')
      .eq('user_id', userId)
      .eq('recorded_by_role', 'guardian');
    setRetentionByGuardian(
      Object.fromEntries(
        ((retention ?? []) as { guardian_id: string; retention_hours: number }[]).map((r) => [
          r.guardian_id,
          r.retention_hours,
        ])
      )
    );
  }, [userId, t]);

  // Refetch every time this tab regains focus, not just on first mount —
  // same reasoning as the guardian screen this mirrors.
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLinks();
    if (openGuardianId) await loadTrail(openGuardianId);
    setRefreshing(false);
  };

  const setRetention = async (guardianId: string, hours: number) => {
    if (!userId) return;
    // Optimistic, same fire-and-forget pattern the guardian screen uses.
    setRetentionByGuardian((prev) => ({ ...prev, [guardianId]: hours }));
    await supabase.from('location_history_retention').upsert(
      {
        user_id: userId,
        guardian_id: guardianId,
        recorded_by_role: 'guardian',
        retention_hours: hours,
      },
      { onConflict: 'user_id,guardian_id,recorded_by_role' }
    );
    if (openGuardianId === guardianId) await loadTrail(guardianId);
  };

  const toggleTrail = (guardianId: string) => {
    if (openGuardianId === guardianId) {
      setOpenGuardianId(null);
      setTrail([]);
      return;
    }
    setOpenGuardianId(guardianId);
    setTrail([]);
    void loadTrail(guardianId);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={guardians}
        keyExtractor={(item) => item.linkId}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.title}>{t('studentGuardianLocationHeading')}</Text>
            <Text style={styles.subtitle}>{t('studentGuardianLocationSubtitle')}</Text>
            {listError && <Text style={styles.error}>{listError}</Text>}
            {loading && <ActivityIndicator style={styles.loadingIndicator} />}
            {!loading && !listError && guardians.length === 0 && (
              <Text style={styles.emptyState}>{t('studentGuardianLocationNoLinks')}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const retentionHours = retentionByGuardian[item.guardianId] ?? DEFAULT_RETENTION_HOURS;
          const windowLabel = t(retentionLabelKey(retentionHours));
          const open = openGuardianId === item.guardianId;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Avatar name={item.fullName} url={item.avatarUrl} size={40} />
                <View style={styles.cardHeaderText}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <Text
                    style={[styles.sharing, item.sharing ? styles.sharingOn : styles.sharingOff]}
                  >
                    {item.sharing
                      ? t('studentGuardianLocationSharingOn')
                      : t('studentGuardianLocationSharingOff')}
                  </Text>
                </View>
              </View>

              <Text style={styles.retentionLabel}>{t('locationHistoryRetentionLabel')}</Text>
              <View style={styles.retentionRow}>
                {RETENTION_PRESETS_HOURS.map((hours) => {
                  const active = retentionHours === hours;
                  return (
                    <Pressable
                      key={hours}
                      style={[styles.retentionOption, active && styles.retentionOptionActive]}
                      onPress={() => setRetention(item.guardianId, hours)}
                    >
                      <Text
                        style={[
                          styles.retentionOptionText,
                          active && styles.retentionOptionTextActive,
                        ]}
                      >
                        {t(retentionLabelKey(hours))}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable onPress={() => toggleTrail(item.guardianId)}>
                <Text style={styles.trailToggle}>
                  {open
                    ? t('studentGuardianLocationHideTrail')
                    : t('studentGuardianLocationViewTrail')}
                </Text>
              </Pressable>

              {open && (
                <View style={styles.trail}>
                  {trailLoading && <ActivityIndicator />}
                  {!trailLoading && trail.length === 0 && (
                    <Text style={styles.trailEmpty}>
                      {t('studentGuardianLocationNoPoints', { window: windowLabel })}
                    </Text>
                  )}
                  {!trailLoading && trail.length > 0 && (
                    <>
                      <Text style={styles.trailMeta}>
                        {t('studentGuardianLocationPointCount', {
                          n: trail.length,
                          window: windowLabel,
                        })}
                      </Text>
                      {trail.map((p) => (
                        <Pressable
                          key={p.id}
                          style={styles.trailPoint}
                          onPress={() =>
                            Linking.openURL(`https://www.google.com/maps?q=${p.lat},${p.lng}`)
                          }
                        >
                          <Text style={styles.trailPointTime}>
                            {new Date(p.recorded_at).toLocaleString()}
                          </Text>
                          <Text style={styles.trailPointLink}>{t('viewOnMapLink')}</Text>
                        </Pressable>
                      ))}
                    </>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  headerBlock: {
    gap: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  error: {
    color: '#d33',
    fontSize: 14,
    marginTop: 8,
  },
  loadingIndicator: {
    marginTop: 12,
  },
  emptyState: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHeaderText: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sharing: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  sharingOn: {
    color: '#1a7f37',
  },
  sharingOff: {
    color: '#888',
  },
  retentionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  retentionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  retentionOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  retentionOptionActive: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  retentionOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  retentionOptionTextActive: {
    color: '#fff',
  },
  trailToggle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2f95dc',
  },
  trail: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
  },
  trailMeta: {
    fontSize: 12,
    color: '#666',
  },
  trailEmpty: {
    fontSize: 13,
    color: '#888',
  },
  trailPoint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  trailPointTime: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  trailPointLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2f95dc',
  },
});
