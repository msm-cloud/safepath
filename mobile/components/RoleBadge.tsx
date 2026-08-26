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
// `style` lets each placement control its own alignment: the base style
// deliberately has no alignSelf, so it sizes to its content and centers
// fine in an alignItems:'center' parent (Settings) with no override
// needed; screens with a default 'stretch' parent (Home, the guardian
// Active Alerts header) pass alignSelf: 'flex-start' so the pill doesn't
// stretch full-width.
export default function RoleBadge({ style }: { style?: TextStyle }) {
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
