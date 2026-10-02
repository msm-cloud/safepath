import { Pressable, View } from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import type { TranslationKey } from '@/lib/translations';
import type { AcceptedGuardian } from '@/lib/use-accepted-guardians';
import { useTheme } from '@/theme';

const AVATAR_SIZE = 36;
const PILL_AVATAR_SIZE = 28;
const PILL_AVATARS_SHOWN = 2;

export type HomeHeaderProps = {
  fullName: string | null;
  avatarPath: string | null;
  // Wall-clock time from the screen; 0 until it has been captured.
  now: number;
  guardians: AcceptedGuardian[];
  guardiansLoaded: boolean;
  onGuardiansPress: () => void;
};

function greetingKey(hour: number): TranslationKey {
  if (hour >= 5 && hour < 12) return 'homeGreetingMorning';
  if (hour >= 12 && hour < 17) return 'homeGreetingAfternoon';
  return 'homeGreetingEvening';
}

export default function HomeHeader({
  fullName,
  avatarPath,
  now,
  guardians,
  guardiansLoaded,
  onGuardiansPress,
}: HomeHeaderProps) {
  const { t } = useLanguage();
  const { colors, radius, spacing } = useTheme();

  const guardiansLabel =
    guardians.length === 0
      ? t('homeAddGuardian')
      : guardians.length === 1
        ? t('homeGuardianCountOne')
        : t('homeGuardianCountOther', { n: guardians.length });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Avatar name={fullName} url={avatarPath} size={AVATAR_SIZE} />
      <View style={{ flex: 1 }}>
        {now > 0 && (
          <Text variant="caption" color="textMuted">
            {t(greetingKey(new Date(now).getHours()))}
          </Text>
        )}
        {fullName && (
          <Text variant="h2" numberOfLines={1}>
            {fullName}
          </Text>
        )}
      </View>

      {guardiansLoaded && (
        <Pressable
          onPress={onGuardiansPress}
          accessibilityRole="button"
          accessibilityLabel={guardiansLabel}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.xs + 2,
            paddingLeft: guardians.length > 0 ? spacing.xs + 2 : spacing.md,
            paddingRight: spacing.md,
            borderRadius: radius.pill,
            borderWidth: 1.5,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          })}
        >
          {guardians.length > 0 && (
            <View style={{ flexDirection: 'row' }}>
              {guardians.slice(0, PILL_AVATARS_SHOWN).map((guardian, index) => (
                <View
                  key={guardian.linkId}
                  style={{
                    marginLeft: index === 0 ? 0 : -spacing.sm,
                    borderRadius: PILL_AVATAR_SIZE,
                    borderWidth: 2,
                    borderColor: colors.surface,
                  }}
                >
                  <Avatar
                    name={guardian.fullName}
                    url={guardian.avatarUrl}
                    size={PILL_AVATAR_SIZE}
                  />
                </View>
              ))}
            </View>
          )}
          <Text variant="label">{guardiansLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
