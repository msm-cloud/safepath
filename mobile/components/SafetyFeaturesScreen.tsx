import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { useUserSettings } from '@/lib/user-settings-context';

// Shared between the student ((tabs)/safety-features.tsx) and guardian
// ((guardian)/safety-features.tsx) tab groups — reachable from Settings
// in either stack, same pattern as ChangePasswordScreen.tsx.
//
// Purely a relocation out of components/SettingsScreen.tsx, grouping
// shake-to-trigger SOS and the fake-call escape together since they're
// conceptually related (both optional, in-app safety/escape features) —
// their underlying logic (UserSettingsProvider's optimistic
// fire-and-forget setters, the same "reads DB once, writes through in
// the background" pattern) is completely unchanged, only where they're
// rendered from.
export default function SafetyFeaturesScreen() {
  const { t } = useLanguage();
  const {
    shakeSosEnabled,
    fakeCallEnabled,
    fakeCallCallerName,
    setShakeSosEnabled,
    setFakeCallEnabled,
    setFakeCallCallerName,
  } = useUserSettings();

  const scrollViewRef = useRef<ScrollView>(null);
  const callerNameInputRef = useRef<TextInput>(null);

  // Local draft so every keystroke doesn't hit the network — persisted via
  // setFakeCallCallerName (which itself updates context immediately, same
  // "optimistic update" pattern as setLanguage) only on blur. useState's
  // initializer alone isn't enough here: fakeCallCallerName arrives
  // asynchronously (fetched from the database after mount), so this
  // effect re-syncs the draft once that real value actually loads —
  // without it, the field would be stuck showing empty even for someone
  // who'd previously saved a name.
  const [callerNameDraft, setCallerNameDraft] = useState(fakeCallCallerName ?? '');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs the local draft once the real value arrives asynchronously from useUserSettings; without this the field would be stuck empty for anyone who'd previously saved a name.
    setCallerNameDraft(fakeCallCallerName ?? '');
  }, [fakeCallCallerName]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // See SettingsScreen.tsx for the full investigation — unconditionally
      // safe on Android.
      enabled={Platform.OS === 'ios'}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('shakeSosToggleLabel')}</Text>
          <Switch value={shakeSosEnabled} onValueChange={setShakeSosEnabled} />
        </View>
        <Text style={styles.toggleHint}>{t('shakeSosToggleHint')}</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('fakeCallToggleLabel')}</Text>
          <Switch value={fakeCallEnabled} onValueChange={setFakeCallEnabled} />
        </View>

        {fakeCallEnabled && (
          <View style={styles.callerNameWrap}>
            <Text style={styles.fieldLabel}>{t('fakeCallCallerNameLabel')}</Text>
            <TextInput
              ref={callerNameInputRef}
              style={styles.input}
              placeholder={t('fakeCallDefaultCallerName')}
              value={callerNameDraft}
              onChangeText={setCallerNameDraft}
              onFocus={() => scrollInputIntoView(scrollViewRef.current, callerNameInputRef)}
              onBlur={() => setFakeCallCallerName(callerNameDraft.trim() || null)}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  toggleHint: {
    alignSelf: 'flex-start',
    fontSize: 12,
    color: '#888',
    marginTop: -8,
  },
  callerNameWrap: {
    width: '100%',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
});
