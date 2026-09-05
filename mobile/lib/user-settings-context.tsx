import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type UserSettingsContextValue = {
  // False until the initial fetch for the current session completes —
  // lets consumers (the Fake Call button, the shake listener) avoid
  // flashing the "off" default before the real saved value is known.
  loaded: boolean;
  shakeSosEnabled: boolean;
  fakeCallEnabled: boolean;
  // Guardian-only device preference — whether a new SOS alert plays
  // looping sound + repeating haptics on THIS device (the alert screens'
  // full-screen flash is unconditional). Meaningless for role = 'user'
  // accounts; see the migration comment for why this isn't the at-risk
  // user's own setting. Defaults to true — see setter below.
  alarmSoundEnabled: boolean;
  // null means "use the app's translated default" — see the
  // fake_call_caller_name column comment in the migration.
  fakeCallCallerName: string | null;
  // Read-only here — null for any account created while "Confirm email"
  // was on before phone got wired into handle_new_user() (see the
  // phone-login migration's own comment), or for a signup that happened
  // to race a duplicate. SettingsScreen.tsx is where this actually gets
  // set/fixed, not this context: unlike the three setters below, saving
  // a phone number is a real, user-facing failure mode (already taken)
  // that needs synchronous error handling — a fire-and-forget optimistic
  // write would either silently drop the error or, worse, show a phone
  // number as "saved" that wasn't.
  phone: string | null;
  // The signed-in user's own display name and profile-photo path — read
  // here for the avatar shown on their own screens (Settings header, Home
  // header, guardian header). full_name is edited on the dashboard, not
  // in the mobile app; avatar_url is set via SettingsScreen (see
  // setAvatarPathLocal). Both null until `loaded`.
  fullName: string | null;
  avatarPath: string | null;
  setShakeSosEnabled: (value: boolean) => void;
  setFakeCallEnabled: (value: boolean) => void;
  setAlarmSoundEnabled: (value: boolean) => void;
  setFakeCallCallerName: (value: string | null) => void;
  // Updates only the in-memory value, once SettingsScreen has confirmed
  // its own write actually succeeded.
  setPhoneLocal: (value: string | null) => void;
  // Same idea as setPhoneLocal: SettingsScreen owns the storage upload +
  // profiles.avatar_url write (real, user-facing failure modes), then
  // syncs the confirmed value back into context for the app-wide avatar.
  setAvatarPathLocal: (value: string | null) => void;
};

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

// Same shape/reasoning as LanguageProvider (see language-context.tsx):
// profiles columns, not local device storage, so these safety-feature
// settings survive a reinstall or a new device rather than silently
// resetting. Updates immediately in local state (so toggles feel instant)
// and writes through to the database in the background, same
// "optimistic update" pattern setLanguage already uses.
export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [shakeSosEnabled, setShakeSosEnabledState] = useState(false);
  const [fakeCallEnabled, setFakeCallEnabledState] = useState(true);
  const [alarmSoundEnabled, setAlarmSoundEnabledState] = useState(true);
  const [fakeCallCallerName, setFakeCallCallerNameState] = useState<string | null>(null);
  const [phone, setPhoneState] = useState<string | null>(null);
  const [fullName, setFullNameState] = useState<string | null>(null);
  const [avatarPath, setAvatarPathState] = useState<string | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || loadedForUserId === userId) return;

    let cancelled = false;
    supabase
      .from('profiles')
      .select(
        'shake_sos_enabled, fake_call_enabled, fake_call_caller_name, alarm_sound_enabled, phone, full_name, avatar_url'
      )
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setShakeSosEnabledState(data.shake_sos_enabled);
          setFakeCallEnabledState(data.fake_call_enabled);
          setFakeCallCallerNameState(data.fake_call_caller_name);
          setAlarmSoundEnabledState(data.alarm_sound_enabled);
          setPhoneState(data.phone);
          setFullNameState(data.full_name);
          setAvatarPathState(data.avatar_url);
        }
        setLoadedForUserId(userId);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, loadedForUserId]);

  const setShakeSosEnabled = useCallback(
    (value: boolean) => {
      setShakeSosEnabledState(value);
      if (userId) {
        supabase.from('profiles').update({ shake_sos_enabled: value }).eq('id', userId);
      }
    },
    [userId]
  );

  const setFakeCallEnabled = useCallback(
    (value: boolean) => {
      setFakeCallEnabledState(value);
      if (userId) {
        supabase.from('profiles').update({ fake_call_enabled: value }).eq('id', userId);
      }
    },
    [userId]
  );

  const setFakeCallCallerName = useCallback(
    (value: string | null) => {
      setFakeCallCallerNameState(value);
      if (userId) {
        supabase.from('profiles').update({ fake_call_caller_name: value }).eq('id', userId);
      }
    },
    [userId]
  );

  const setAlarmSoundEnabled = useCallback(
    (value: boolean) => {
      setAlarmSoundEnabledState(value);
      if (userId) {
        supabase.from('profiles').update({ alarm_sound_enabled: value }).eq('id', userId);
      }
    },
    [userId]
  );

  return (
    <UserSettingsContext.Provider
      value={{
        loaded: loadedForUserId === userId && !!userId,
        shakeSosEnabled,
        fakeCallEnabled,
        fakeCallCallerName,
        alarmSoundEnabled,
        phone,
        fullName,
        avatarPath,
        setShakeSosEnabled,
        setFakeCallEnabled,
        setFakeCallCallerName,
        setAlarmSoundEnabled,
        setPhoneLocal: setPhoneState,
        setAvatarPathLocal: setAvatarPathState,
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return ctx;
}
