import type { Ref } from 'react';
import { View, type TextInput } from 'react-native';

import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import IconTile from '@/components/ui/IconTile';
import Input from '@/components/ui/Input';
import SegmentedControl from '@/components/ui/SegmentedControl';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/theme';

const JOURNEY_ICON = {
  ios: 'point.topleft.down.to.point.bottomright.curvepath',
  android: 'route',
  web: 'route',
} as const;

export type JourneyCardJourney = {
  destinationNote: string | null;
  status: 'active' | 'arrived_safe' | 'alert_triggered' | 'cancelled';
};

export type JourneyCardProps = {
  // The most recent journey, or null when there has never been one.
  journey: JourneyCardJourney | null;
  // Minutes until the expected arrival; negative once overdue.
  minutesUntil: number;

  durationOptions: number[];
  selectedDuration: number;
  onSelectDuration: (minutes: number) => void;
  destinationNote: string;
  onChangeDestinationNote: (note: string) => void;
  destinationNoteRef: Ref<TextInput>;
  onDestinationNoteFocus: () => void;
  starting: boolean;
  createError: string | null;
  onStart: () => void;

  actionPending: boolean;
  actionError: string | null;
  onArrivedSafely: () => void;
  onAddTime: () => void;
};

// The Home journey check: the start form, or the journey in progress.
// Presentation only; the screen owns the journey row and every write.
export default function JourneyCard(props: JourneyCardProps) {
  const { journey } = props;
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.md }}>
      {journey?.status === 'alert_triggered' && <OverdueBanner />}
      {journey?.status === 'active' ? <ActiveJourney {...props} /> : <StartJourney {...props} />}
    </View>
  );
}

function OverdueBanner() {
  const { t } = useLanguage();
  return <Banner tone="danger" message={t('journeyAlertTriggeredBanner')} />;
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <IconTile icon={JOURNEY_ICON} tone="primary" size={44} />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="title">{title}</Text>
        {subtitle && (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

function ActiveJourney({
  journey,
  minutesUntil,
  actionPending,
  actionError,
  onArrivedSafely,
  onAddTime,
}: JourneyCardProps) {
  const { t } = useLanguage();
  const { spacing } = useTheme();

  return (
    <Card style={{ gap: spacing.md }}>
      <CardHeader
        title={t('journeyActiveLabel')}
        subtitle={
          journey?.destinationNote
            ? t('journeyDestinationLabel', { note: journey.destinationNote })
            : undefined
        }
      />
      <Text variant="body" weight="semibold" color={minutesUntil >= 0 ? 'text' : 'dangerText'}>
        {minutesUntil >= 0
          ? t('journeyTimeRemaining', { n: minutesUntil })
          : t('journeyOverdueByMinutes', { n: Math.abs(minutesUntil) })}
      </Text>

      {actionError && <Banner tone="danger" message={actionError} />}

      <Button
        title={t('arrivedSafelyButton')}
        variant="primary"
        onPress={onArrivedSafely}
        disabled={actionPending}
      />
      <Button
        title={t('addFifteenMinutesButton')}
        variant="secondary"
        onPress={onAddTime}
        disabled={actionPending}
      />
    </Card>
  );
}

function StartJourney({
  durationOptions,
  selectedDuration,
  onSelectDuration,
  destinationNote,
  onChangeDestinationNote,
  destinationNoteRef,
  onDestinationNoteFocus,
  starting,
  createError,
  onStart,
}: JourneyCardProps) {
  const { t } = useLanguage();
  const { spacing } = useTheme();

  return (
    <Card style={{ gap: spacing.lg }}>
      <CardHeader title={t('startJourneyTitle')} subtitle={t('startJourneySubtitle')} />

      <View style={{ gap: spacing.xs + 2 }}>
        <Text variant="label">{t('journeyDurationLabel')}</Text>
        <SegmentedControl
          fullWidth
          accessibilityLabel={t('journeyDurationLabel')}
          options={durationOptions.map((minutes) => ({
            value: String(minutes),
            label: t('journeyDurationMinutesOption', { n: minutes }),
          }))}
          value={String(selectedDuration)}
          onChange={(value) => onSelectDuration(Number(value))}
        />
      </View>

      <Input
        ref={destinationNoteRef}
        label={t('journeyDestinationNoteLabel')}
        placeholder={t('destinationNotePlaceholder')}
        value={destinationNote}
        onChangeText={onChangeDestinationNote}
        onFocus={onDestinationNoteFocus}
      />

      {createError && <Banner tone="danger" message={createError} />}

      <Button
        title={t('startJourneyButton')}
        variant="primary"
        onPress={onStart}
        loading={starting}
        disabled={starting}
      />
    </Card>
  );
}
