import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/theme';

// The trust line on the welcome and log-in screens. Both sit on a photo,
// so the icon uses the overlay text colour.
export default function LocationPrivacyNote() {
  const { t } = useLanguage();
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
      <SymbolView
        name={{ ios: 'lock', android: 'lock', web: 'lock' }}
        tintColor={colors.onOverlay}
        size={18}
      />
      <Text variant="caption" style={{ flex: 1 }}>
        {t('locationPrivacyNote')}
      </Text>
    </View>
  );
}
