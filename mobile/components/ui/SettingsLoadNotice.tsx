import { Linking } from 'react-native';

import Banner from '@/components/ui/Banner';
import { useLanguage } from '@/lib/language-context';
import { SUPPORT_EMAIL } from '@/lib/support';
import { useUserSettings } from '@/lib/user-settings-context';

// Explains why settings-driven controls are disabled when the saved
// settings can't be loaded. Renders nothing while loading normally or once
// loaded.
export default function SettingsLoadNotice() {
  const { t } = useLanguage();
  const { loadState } = useUserSettings();

  if (loadState === 'retrying') {
    return <Banner tone="warning" message={t('settingsLoadRetrying')} />;
  }

  if (loadState === 'missing') {
    return (
      <Banner
        tone="danger"
        message={
          SUPPORT_EMAIL
            ? t('settingsProfileMissingWithEmail', { email: SUPPORT_EMAIL })
            : t('settingsProfileMissing')
        }
        action={
          SUPPORT_EMAIL
            ? {
                label: t('emailSupportButton'),
                onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`),
              }
            : undefined
        }
      />
    );
  }

  return null;
}
