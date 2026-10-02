import { View, type ViewStyle } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/theme';

import Text from './Text';

export type RoleBadgeProps = {
  // Required on purpose: a pill left to inherit alignSelf stretched
  // full-width on native while looking right on web, so every caller has
  // to decide where it sits.
  style: Pick<ViewStyle, 'alignSelf'>;
};

// Small "signed in as" label. It is a clarity aid, not a warning, so it
// stays a pill rather than a banner. The role comes from the same
// profile.role the root layout routes on, and nothing renders until it
// has loaded so the label never flashes the wrong role.
export default function RoleBadge({ style }: RoleBadgeProps) {
  const { role } = useAuth();
  const { t } = useLanguage();
  const { colors, radius, spacing } = useTheme();

  if (!role) return null;

  return (
    <View
      style={[
        {
          backgroundColor: colors.track,
          borderRadius: radius.pill,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
        },
        style,
      ]}
    >
      {/* Android can measure Bangla wider than it draws, so centre the
          label rather than leave the spare width on one side. */}
      <Text variant="micro" color="textSecondary" align="center">
        {role === 'guardian' ? t('signedInAsGuardianBadge') : t('signedInAsStudentBadge')}
      </Text>
    </View>
  );
}
