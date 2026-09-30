import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useUserSettings } from '@/lib/user-settings-context';

// Sign-up doesn't check whether a phone is already taken (that would let
// anyone look up registered numbers), so handle_new_user() drops a
// duplicate one silently. The account owner finds out here instead.
// Disappears once a number is saved on the Phone Number screen, which
// updates the settings context.
export default function PhoneNotSavedNotice() {
  const { session } = useAuth();
  const { loaded, phone } = useUserSettings();
  const { t } = useLanguage();

  const signedUpWithPhone = typeof session?.user.user_metadata?.phone === 'string';
  if (!loaded || phone || !signedUpWithPhone) return null;

  return (
    <Pressable
      style={styles.banner}
      onPress={() => router.push('/phone-number')}
      accessibilityRole="button"
    >
      <Text style={styles.text}>{t('phoneNotSavedMessage')}</Text>
      <Text style={styles.action}>{t('phoneNotSavedAction')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fff4e5',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  text: {
    color: '#7a4a00',
    fontSize: 13,
  },
  action: {
    color: '#7a4a00',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
