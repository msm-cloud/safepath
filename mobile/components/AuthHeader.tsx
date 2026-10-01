import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import SegmentedControl from '@/components/ui/SegmentedControl';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import type { Language } from '@/lib/translations';
import { useTheme } from '@/theme';

type AuthHeaderProps = {
  // Screens reached from the welcome screen show a back button; the welcome
  // and log-in screens show the brand instead.
  leading: 'brand' | 'back';
};

// The language switch sits on every signed-out screen so someone can change
// it before typing anything; the choice is saved with the new account.
export default function AuthHeader({ leading }: AuthHeaderProps) {
  const { t, language, setLanguage } = useLanguage();
  const { colors, sizes, spacing } = useTheme();
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)');
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {leading === 'brand' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SymbolView
            name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }}
            tintColor={colors.onOverlay}
            size={30}
          />
          <Text variant="title" script="latin">
            SafePath
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('backLabel')}
          hitSlop={spacing.xs}
          style={{
            width: sizes.minTouch,
            height: sizes.minTouch,
            borderRadius: sizes.minTouch / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
          }}
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            tintColor={colors.text}
            size={22}
          />
        </Pressable>
      )}
      <SegmentedControl<Language>
        accessibilityLabel={t('languageSwitchLabel')}
        value={language}
        onChange={setLanguage}
        options={[
          { value: 'en', label: 'EN', accessibilityLabel: 'English' },
          { value: 'bn', label: 'বাংলা' },
        ]}
      />
    </View>
  );
}
