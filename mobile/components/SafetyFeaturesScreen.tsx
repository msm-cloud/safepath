import { Alert } from 'react-native';

import ListGroup from '@/components/ui/ListGroup';
import Screen from '@/components/ui/Screen';
import SettingsLoadNotice from '@/components/ui/SettingsLoadNotice';
import SwitchRow from '@/components/ui/SwitchRow';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useUserSettings } from '@/lib/user-settings-context';
import { useTheme } from '@/theme';

// Shared between the student ((tabs)/safety-features.tsx) and guardian
// ((guardian)/safety-features.tsx) tab groups — reachable from Settings
// in either stack, same pattern as ChangePasswordScreen.tsx.
//
// Purely a relocation out of components/SettingsScreen.tsx, grouping
// shake-to-trigger SOS and the fake-call escape together since they're
// conceptually related (both optional, in-app safety/escape features) —
// their underlying logic (UserSettingsProvider's optimistic setters,
// which roll back when the write fails) is unchanged, only where they're
// rendered from.
//
// The alarm-sound toggle added below is the one row on this shared screen
// that DOES differ by role — shake/fake-call are the at-risk user's own
// escape tools and apply to either role's own device, but alarm_sound_enabled
// is specifically "does MY device make noise when I, as a guardian, receive
// someone else's alert" (see the migration's comment) — meaningless for a
// role='user' account, so it's gated on role the same way SettingsScreen.tsx
// already gates its Emergency Contacts row on role === 'user'.
export default function SafetyFeaturesScreen() {
  const { t } = useLanguage();
  const { role } = useAuth();
  const {
    loaded,
    shakeSosEnabled,
    fakeCallEnabled,
    alarmSoundEnabled,
    setShakeSosEnabled,
    setFakeCallEnabled,
    setAlarmSoundEnabled,
  } = useUserSettings();

  const { spacing } = useTheme();

  // The setters undo the change themselves when the write fails; this
  // only tells the person why it flipped back.
  const reportIfUnsaved = (save: Promise<boolean>) => {
    void save.then((saved) => {
      if (!saved) Alert.alert(t('settingSaveFailedTitle'), t('settingSaveFailedMessage'));
    });
  };

  return (
    <Screen edges={[]} contentStyle={{ gap: spacing.xl }}>
      <SettingsLoadNotice />
      <ListGroup>
        <SwitchRow
          title={t('shakeSosToggleLabel')}
          hint={t('shakeSosToggleHint')}
          icon={{
            ios: 'iphone.radiowaves.left.and.right',
            android: 'vibration',
            web: 'vibration',
          }}
          iconTone="danger"
          value={shakeSosEnabled}
          onValueChange={(value) => reportIfUnsaved(setShakeSosEnabled(value))}
          disabled={!loaded}
        />
        <SwitchRow
          title={t('fakeCallToggleLabel')}
          icon={{ ios: 'phone.arrow.down.left', android: 'phone_callback', web: 'phone_callback' }}
          iconTone="primarySoft"
          value={fakeCallEnabled}
          onValueChange={(value) => reportIfUnsaved(setFakeCallEnabled(value))}
          disabled={!loaded}
        />
        {role === 'guardian' && (
          <SwitchRow
            title={t('alarmSoundToggleLabel')}
            hint={t('alarmSoundToggleHint')}
            icon={{ ios: 'speaker.wave.3.fill', android: 'volume_up', web: 'volume_up' }}
            iconTone="warning"
            value={alarmSoundEnabled}
            onValueChange={(value) => reportIfUnsaved(setAlarmSoundEnabled(value))}
            disabled={!loaded}
          />
        )}
      </ListGroup>
    </Screen>
  );
}
