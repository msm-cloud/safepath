import { useEffect, useRef, useState } from 'react';
import { Alert, type ScrollView, type TextInput, View } from 'react-native';

import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import ListGroup from '@/components/ui/ListGroup';
import Screen from '@/components/ui/Screen';
import SwitchRow from '@/components/ui/SwitchRow';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
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
    shakeSosEnabled,
    fakeCallEnabled,
    fakeCallCallerName,
    alarmSoundEnabled,
    setShakeSosEnabled,
    setFakeCallEnabled,
    setFakeCallCallerName,
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

  const scrollViewRef = useRef<ScrollView>(null);
  const callerNameInputRef = useRef<TextInput>(null);

  // Local draft so every keystroke doesn't hit the network — persisted via
  // setFakeCallCallerName (which itself updates context immediately) only
  // on blur. useState's initializer alone isn't enough here:
  // fakeCallCallerName arrives asynchronously (fetched from the database
  // after mount), so this effect re-syncs the draft once that real value
  // actually loads, and again if a failed save rolls the name back —
  // without it, the field would be stuck showing empty even for someone
  // who'd previously saved a name.
  const [callerNameDraft, setCallerNameDraft] = useState(fakeCallCallerName ?? '');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs the local draft once the real value arrives asynchronously from useUserSettings; without this the field would be stuck empty for anyone who'd previously saved a name.
    setCallerNameDraft(fakeCallCallerName ?? '');
  }, [fakeCallCallerName]);

  return (
    <Screen edges={[]} scrollRef={scrollViewRef} contentStyle={{ gap: spacing.xl }}>
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
        />
        <SwitchRow
          title={t('fakeCallToggleLabel')}
          icon={{ ios: 'phone.arrow.down.left', android: 'phone_callback', web: 'phone_callback' }}
          iconTone="primarySoft"
          value={fakeCallEnabled}
          onValueChange={(value) => reportIfUnsaved(setFakeCallEnabled(value))}
        />
        {role === 'guardian' && (
          <SwitchRow
            title={t('alarmSoundToggleLabel')}
            hint={t('alarmSoundToggleHint')}
            icon={{ ios: 'speaker.wave.3.fill', android: 'volume_up', web: 'volume_up' }}
            iconTone="warning"
            value={alarmSoundEnabled}
            onValueChange={(value) => reportIfUnsaved(setAlarmSoundEnabled(value))}
          />
        )}
      </ListGroup>

      {fakeCallEnabled && (
        <Card>
          <View>
            <Input
              ref={callerNameInputRef}
              label={t('fakeCallCallerNameLabel')}
              placeholder={t('fakeCallDefaultCallerName')}
              value={callerNameDraft}
              onChangeText={setCallerNameDraft}
              onFocus={() => scrollInputIntoView(scrollViewRef.current, callerNameInputRef)}
              onBlur={() => reportIfUnsaved(setFakeCallCallerName(callerNameDraft.trim() || null))}
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}
