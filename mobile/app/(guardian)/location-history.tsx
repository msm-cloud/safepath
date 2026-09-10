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

// The guardian-side "Recorded Live Location" screen — its own tab, between
// "Link to Someone" and "Settings". For each person this guardian
// supports: whether recording is currently on, how long this guardian
// keeps the trail (a retention the student can also change — see
// location_history_retention RLS), and the saved trail itself as a list of
// Google Maps deep links (the same prior art as the SOS / live-sharing
// cards; there is no embedded map anywhere in this app).
//
// Fetch-on-focus + pull-to-refresh, not Realtime — a 5-minute breadcrumb
// trail has no real-time value, but the list still needs to catch a
// student toggling recording on/off (or a retention change) while this tab
// sits open in the background, so the refetch runs on every focus rather
// than once on mount. The retention window is enforced server-side by the
// location_history_points SELECT policy, so the trail query needs no
// explicit time filter.

const TRAIL_LIMIT = 200;

type LinkedUser = {
  linkId: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  recording: boolean;
};

type TrailPoint = { id: string; lat: number; lng: number; recorded_at: string };

export default function GuardianLocationHistoryScreen() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const guardianId = session?.user.id;

  const [users, setUsers] = useState<LinkedUser[]>([]);
  const [retentionByUser, setRetentionByUser] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Per-user expanded trail — only one open at a time.
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);

  const loadTrail = useCallback(async (userId: string) => {
    setTrailLoading(true);
    const { data } = await supabase
      .from('location_history_points')
      .select('id, lat, lng, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(TRAIL_LIMIT);
    setTrail((data ?? []) as TrailPoint[]);
    setTrailLoading(false);
  }, []);

  const fetchLinks = useCallback(async () => {
    if (!guardianId) return;

    const { data, error } = await supabase
      .from('guardian_links')
      .select(
        'id, user_id, user:profiles!guardian_links_user_id_fkey(full_name, avatar_url, location_history_enabled)'
      )
      .eq('guardian_id', guardianId)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false });

    if (error) {
      setListError(error.message);
      return;
    }
    setListError(null);

    const rows = data as unknown as {
      id: string;
      user_id: string;
      user: {
        full_name: string;
        avatar_url: string | null;
        location_history_enabled: boolean;
      } | null;
    }[];

    setUsers(
      rows.map((r) => ({
        linkId: r.id,
        userId: r.user_id,
        fullName: r.user?.full_name || t('unnamedUser'),
        avatarUrl: r.user?.avatar_url ?? null,
        recording: r.user?.location_history_enabled ?? false,
      }))
    );

    const { data: retention } = await supabase
      .from('location_history_retention')
      .select('user_id, retention_hours')
      .eq('guardian_id', guardianId);
    setRetentionByUser(
      Object.fromEntries(
        ((retention ?? []) as { user_id: string; retention_hours: number }[]).map((r) => [
          r.user_id,
          r.retention_hours,
        ])
      )
    );
  }, [guardianId, t]);

  // Refetch every time this tab regains focus, not just on first mount. The
  // tab stays mounted once visited, so a plain useEffect would never pick
  // up a student toggling recording on/off (or a retention change) while
  // the guardian has this tab open — they'd have to pull-to-refresh.
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
    if (openUserId) await loadTrail(openUserId);
    setRefreshing(false);
  };

  const setRetention = async (userId: string, hours: number) => {
    if (!guardianId) return;
    // Optimistic, same fire-and-forget pattern the settings toggles use.
    setRetentionByUser((prev) => ({ ...prev, [userId]: hours }));
    await supabase
      .from('location_history_retention')
      .upsert(
        { user_id: userId, guardian_id: guardianId, retention_hours: hours },
        { onConflict: 'user_id,guardian_id' }
      );
    if (openUserId === userId) await loadTrail(userId);
  };

  const toggleTrail = (userId: string) => {
    if (openUserId === userId) {
      setOpenUserId(null);
      setTrail([]);
      return;
    }
    setOpenUserId(userId);
    setTrail([]);
    void loadTrail(userId);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.linkId}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.title}>{t('guardianLocationHistoryHeading')}</Text>
            <Text style={styles.subtitle}>{t('guardianLocationHistorySubtitle')}</Text>
            {listError && <Text style={styles.error}>{listError}</Text>}
            {loading && <ActivityIndicator style={styles.loadingIndicator} />}
            {!loading && !listError && users.length === 0 && (
              <Text style={styles.emptyState}>{t('guardianLocationHistoryNoLinks')}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const retentionHours = retentionByUser[item.userId] ?? DEFAULT_RETENTION_HOURS;
          const windowLabel = t(retentionLabelKey(retentionHours));
          const open = openUserId === item.userId;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Avatar name={item.fullName} url={item.avatarUrl} size={40} />
                <View style={styles.cardHeaderText}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <Text
                    style={[
                      styles.recording,
                      item.recording ? styles.recordingOn : styles.recordingOff,
                    ]}
                  >
                    {item.recording
                      ? t('guardianLocationHistoryRecordingOn')
                      : t('guardianLocationHistoryRecordingOff')}
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
                      onPress={() => setRetention(item.userId, hours)}
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

              <Pressable onPress={() => toggleTrail(item.userId)}>
                <Text style={styles.trailToggle}>
                  {open
                    ? t('guardianLocationHistoryHideTrail')
                    : t('guardianLocationHistoryViewTrail')}
                </Text>
              </Pressable>

              {open && (
                <View style={styles.trail}>
                  {trailLoading && <ActivityIndicator />}
                  {!trailLoading && trail.length === 0 && (
                    <Text style={styles.trailEmpty}>
                      {t('guardianLocationHistoryNoPoints', { window: windowLabel })}
                    </Text>
                  )}
                  {!trailLoading && trail.length > 0 && (
                    <>
                      <Text style={styles.trailMeta}>
                        {t('guardianLocationHistoryPointCount', {
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
  recording: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  recordingOn: {
    color: '#1a7f37',
  },
  recordingOff: {
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
