import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Linking, Pressable, RefreshControl, View } from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Screen from '@/components/ui/Screen';
import SegmentedControl from '@/components/ui/SegmentedControl';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import {
  DEFAULT_RETENTION_HOURS,
  RETENTION_PRESETS_HOURS,
  retentionLabelKey,
} from '@/lib/location-history-retention';
import type { TranslationKey } from '@/lib/translations';
import type {
  HistoryViewer,
  LinkedLocationHistory,
  LinkedPerson,
  TrailPoint,
} from '@/lib/use-linked-location-history';
import { useTheme } from '@/theme';

// Shared body of the guardian's "Recorded Location" tab and the student's
// "Guardian's Shared Location" screen; the route files own the data hook so
// the guardian side can also listen for revoked links.

type Copy = {
  intro: TranslationKey;
  empty: TranslationKey;
  on: TranslationKey;
  off: TranslationKey;
  noPoints: TranslationKey;
  pointCount: TranslationKey;
};

const COPY: Record<HistoryViewer, Copy> = {
  guardian: {
    intro: 'guardianLocationHistorySubtitle',
    empty: 'guardianLocationHistoryNoLinks',
    on: 'guardianLocationHistoryRecordingOn',
    off: 'guardianLocationHistoryRecordingOff',
    noPoints: 'guardianLocationHistoryNoPoints',
    pointCount: 'guardianLocationHistoryPointCount',
  },
  user: {
    intro: 'studentGuardianLocationSubtitle',
    empty: 'studentGuardianLocationNoLinks',
    on: 'studentGuardianLocationSharingOn',
    off: 'studentGuardianLocationSharingOff',
    noPoints: 'studentGuardianLocationNoPoints',
    pointCount: 'studentGuardianLocationPointCount',
  },
};

const AVATAR_SIZE = 44;

export type LocationHistoryListProps = {
  viewer: HistoryViewer;
  history: LinkedLocationHistory;
};

export default function LocationHistoryList({ viewer, history }: LocationHistoryListProps) {
  const { t } = useLanguage();
  const { spacing } = useTheme();
  const copy = COPY[viewer];
  const { people, loading, refreshing, error, refresh } = history;

  return (
    <Screen
      edges={[]}
      contentStyle={{ gap: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text variant="bodySm" color="textMuted">
        {t(copy.intro)}
      </Text>
      {error && <Banner tone="danger" message={error} />}
      {loading && <ActivityIndicator />}
      {!loading && !error && people.length === 0 && (
        <EmptyState
          icon={{ ios: 'location.slash', android: 'location_off', web: 'location_off' }}
          title={t(copy.empty)}
        />
      )}
      {people.map((person) => (
        <PersonCard key={person.linkId} person={person} copy={copy} history={history} />
      ))}
    </Screen>
  );
}

function PersonCard({
  person,
  copy,
  history,
}: {
  person: LinkedPerson;
  copy: Copy;
  history: LinkedLocationHistory;
}) {
  const { t } = useLanguage();
  const { colors, radius, spacing } = useTheme();
  const retentionHours = history.retentionByPerson[person.personId] ?? DEFAULT_RETENTION_HOURS;
  const windowLabel = t(retentionLabelKey(retentionHours));
  const open = history.openPersonId === person.personId;

  return (
    <Card style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={person.fullName} url={person.avatarUrl} size={AVATAR_SIZE} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="title" numberOfLines={2}>
            {person.fullName}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: spacing.xs,
              paddingVertical: spacing.xxs,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: person.recording ? colors.successSoft : colors.track,
            }}
          >
            <SymbolView
              name={
                person.recording
                  ? {
                      ios: 'record.circle',
                      android: 'radio_button_checked',
                      web: 'radio_button_checked',
                    }
                  : { ios: 'pause.circle', android: 'pause_circle', web: 'pause_circle' }
              }
              tintColor={person.recording ? colors.onSuccessSoft : colors.textSecondary}
              size={14}
            />
            <Text variant="micro" color={person.recording ? 'onSuccessSoft' : 'textSecondary'}>
              {t(person.recording ? copy.on : copy.off)}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" color="textSecondary">
          {t('locationHistoryRetentionLabel')}
        </Text>
        <SegmentedControl
          fullWidth
          accessibilityLabel={t('locationHistoryRetentionLabel')}
          options={RETENTION_PRESETS_HOURS.map((hours) => ({
            value: String(hours),
            label: t(retentionLabelKey(hours)),
          }))}
          value={String(retentionHours)}
          onChange={(value) => void history.setRetention(person.personId, Number(value))}
        />
      </View>

      <Button
        title={t(open ? 'locationHistoryHideTrail' : 'locationHistoryViewTrail')}
        variant="secondary"
        size="small"
        icon={
          open
            ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
            : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }
        }
        onPress={() => history.toggleTrail(person.personId)}
      />

      {open && (
        <Trail
          points={history.trail}
          loading={history.trailLoading}
          emptyText={t(copy.noPoints, { window: windowLabel })}
          countText={t(copy.pointCount, { n: history.trail.length, window: windowLabel })}
        />
      )}
    </Card>
  );
}

function Trail({
  points,
  loading,
  emptyText,
  countText,
}: {
  points: TrailPoint[];
  loading: boolean;
  emptyText: string;
  countText: string;
}) {
  const { t } = useLanguage();
  const { colors, sizes, spacing } = useTheme();

  if (loading) return <ActivityIndicator />;
  if (points.length === 0) {
    return (
      <Text variant="bodySm" color="textMuted">
        {emptyText}
      </Text>
    );
  }

  return (
    <View>
      <Text variant="caption" color="textMuted" style={{ marginBottom: spacing.xs }}>
        {countText}
      </Text>
      {points.map((point, index) => {
        const time = new Date(point.recorded_at).toLocaleString();
        return (
          <Pressable
            key={point.id}
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps?q=${point.lat},${point.lng}`)
            }
            accessibilityRole="link"
            accessibilityLabel={`${time}, ${t('viewOnMapLink')}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: sizes.minTouch,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text variant="bodySm" style={{ flex: 1 }}>
              {time}
            </Text>
            <Text variant="label" color="primary">
              {t('viewOnMapLink')}
            </Text>
            <SymbolView
              name={{ ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' }}
              tintColor={colors.primary}
              size={16}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
