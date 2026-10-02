import { router } from 'expo-router';
import { View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useUserSettings } from '@/lib/user-settings-context';
import { useTheme } from '@/theme';

import Banner from './Banner';

// Sign-up doesn't check whether a phone is already taken (that would let
// anyone look up registered numbers), so handle_new_user() drops a
// duplicate one silently. The account owner finds out here instead. It
// disappears once a number is saved on the Phone Number screen, which
// updates the settings context.
export default function PhoneNotSavedNotice() {
  const { session } = useAuth();
  const { loaded, phone } = useUserSettings();
  const { t } = useLanguage();
  const { spacing } = useTheme();

  const signedUpWithPhone = typeof session?.user.user_metadata?.phone === 'string';
  if (!loaded || phone || !signedUpWithPhone) return null;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Banner
        tone="warning"
        message={t('phoneNotSavedMessage')}
        action={{ label: t('phoneNotSavedAction'), onPress: () => router.push('/phone-number') }}
      />
    </View>
  );
}
