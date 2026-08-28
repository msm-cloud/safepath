import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { supabase } from '@/lib/supabase';
import { useUserSettings } from '@/lib/user-settings-context';
import { isValidPhone } from '@/lib/validation';

// profiles.phone's unique index violation — see
// supabase/migrations/20260828063528_phone_login_and_password_reset.sql.
const PHONE_UNIQUE_VIOLATION = '23505';

// Shared between the student ((tabs)/phone-number.tsx) and guardian
// ((guardian)/phone-number.tsx) tab groups — reachable from Settings in
// either stack, same pattern as ChangePasswordScreen.tsx.
//
// Purely a relocation out of components/SettingsScreen.tsx — the phone
// field's own logic (its own local draft/error/saving state, not
// UserSettingsProvider's optimistic fire-and-forget setters, because a
// duplicate phone number is a real, user-facing failure that has to be
// shown) is unchanged, only where it's rendered from.
export default function PhoneNumberSettingsScreen() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const { phone, setPhoneLocal } = useUserSettings();
  const userId = session?.user.id;

  const scrollViewRef = useRef<ScrollView>(null);
  const phoneInputRef = useRef<TextInput>(null);

  const [phoneDraft, setPhoneDraft] = useState(phone ?? '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs the local draft once the real value arrives asynchronously from useUserSettings; without this the field would be stuck empty for anyone who'd previously saved a phone number.
    setPhoneDraft(phone ?? '');
  }, [phone]);

  const handleSavePhone = async () => {
    setPhoneError(null);
    setPhoneSaved(false);

    const trimmed = phoneDraft.trim();
    if (!isValidPhone(trimmed)) {
      setPhoneError(t('invalidPhone'));
      return;
    }
    if (!userId) return;

    setSavingPhone(true);
    const { error } = await supabase.from('profiles').update({ phone: trimmed }).eq('id', userId);
    setSavingPhone(false);

    if (error) {
      // profiles_phone_normalized_key — same duplicate-phone check as
      // sign-up, surfaced the same way.
      setPhoneError(
        error.code === PHONE_UNIQUE_VIOLATION ? t('duplicatePhoneError') : error.message
      );
      return;
    }

    setPhoneLocal(trimmed);
    setPhoneSaved(true);
  };

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
        <Text style={styles.fieldLabel}>{t('phonePlaceholder')}</Text>
        <TextInput
          ref={phoneInputRef}
          style={styles.input}
          placeholder={t('phonePlaceholder')}
          autoComplete="tel"
          keyboardType="phone-pad"
          value={phoneDraft}
          onChangeText={(value) => {
            setPhoneDraft(value);
            setPhoneSaved(false);
          }}
          onFocus={() => scrollInputIntoView(scrollViewRef.current, phoneInputRef)}
        />
        {phoneError && <Text style={styles.fieldError}>{phoneError}</Text>}
        {phoneSaved && <Text style={styles.fieldSaved}>{t('phoneSavedMessage')}</Text>}
        <Pressable
          style={[styles.savePhoneButton, savingPhone && styles.buttonDisabled]}
          onPress={handleSavePhone}
          disabled={savingPhone || phoneDraft.trim() === (phone ?? '')}
        >
          {savingPhone ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.savePhoneButtonText}>{t('saveButton')}</Text>
          )}
        </Pressable>
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
    gap: 6,
  },
  fieldError: {
    color: '#d33',
    fontSize: 13,
  },
  fieldSaved: {
    color: '#1a7f37',
    fontSize: 13,
  },
  savePhoneButton: {
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  savePhoneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
