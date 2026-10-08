import { useEffect, useRef, useState } from 'react';
import { type ScrollView, type TextInput, View } from 'react-native';

import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Screen from '@/components/ui/Screen';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import { useInputScroll } from '@/lib/use-input-scroll';
import { useUserSettings } from '@/lib/user-settings-context';
import { isValidPhone } from '@/lib/validation';
import { useTheme } from '@/theme';

// profiles.phone's unique index violation — see
// supabase/migrations/20260828063528_phone_login_and_password_reset.sql.
const PHONE_UNIQUE_VIOLATION = '23505';

// Shared between the student ((tabs)/phone-number.tsx) and guardian
// ((guardian)/phone-number.tsx) tab groups — reachable from Settings in
// either stack, same pattern as ChangePasswordScreen.tsx.
//
// Purely a relocation out of components/SettingsScreen.tsx — the phone
// field's own logic (its own local draft/error/saving state, not
// UserSettingsProvider's optimistic setters, because a duplicate phone
// number is a real, user-facing failure that has to be shown inline) is
// unchanged, only where it's rendered from.
export default function PhoneNumberSettingsScreen() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const { phone, setPhoneLocal } = useUserSettings();
  const { spacing } = useTheme();
  const userId = session?.user.id;

  const scrollRef = useRef<ScrollView>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const { onInputFocus, onInputBlur } = useInputScroll(scrollRef);

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
    <Screen edges={[]} scrollRef={scrollRef} contentStyle={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.lg }}>
        <Input
          ref={phoneInputRef}
          label={t('phoneLabel')}
          autoComplete="tel"
          keyboardType="phone-pad"
          returnKeyType="done"
          value={phoneDraft}
          error={phoneError ?? undefined}
          onChangeText={(value) => {
            setPhoneDraft(value);
            setPhoneSaved(false);
          }}
          onFocus={() => onInputFocus(phoneInputRef)}
          onBlur={() => onInputBlur(phoneInputRef)}
          onSubmitEditing={handleSavePhone}
        />
        {phoneSaved && <Banner tone="success" message={t('phoneSavedMessage')} />}
      </View>

      <View style={{ marginTop: 'auto' }}>
        <Button
          title={t('saveButton')}
          loading={savingPhone}
          disabled={phoneDraft.trim() === (phone ?? '')}
          onPress={handleSavePhone}
        />
      </View>
    </Screen>
  );
}
