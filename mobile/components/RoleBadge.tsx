import { StyleSheet, Text, type TextStyle } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

// Small, persistent "which role am I signed in as" indicator — a clarity
// aid, not a warning, so it stays a small label rather than a banner.
// Pulls role from useAuth() (the same profile.role value the root layout
// already uses to route between the (tabs) and (guardian) tab groups) —
// no second source of truth. Renders nothing while role hasn't loaded yet
// (matches the root layout's own "don't show anything until it's known"
// approach, rather than flashing a possibly-wrong label).
//
// `style` is REQUIRED, not optional, and must include an explicit
// alignSelf — deliberately, after a real bug: relying on inherited/'auto'
// alignSelf to shrink-wrap this Text (which carries backgroundColor +
// padding for the pill shape) rendered correctly on web but stretched
// full-width on native (confirmed via screenshot on the Settings screen).
// Making the caller supply alignSelf explicitly, every time, turns
// "forgot to think about alignment in this layout" into a compile error
// instead of a silent stretch bug the next time this component lands in
// a new screen with different surrounding layout.
export default function RoleBadge({ style }: { style: Pick<TextStyle, 'alignSelf'> }) {
  const { role } = useAuth();
  const { t } = useLanguage();

  if (!role) return null;

  return (
    <Text style={[styles.badge, style]}>
      {role === 'guardian' ? t('signedInAsGuardianBadge') : t('signedInAsStudentBadge')}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#eee',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
});
