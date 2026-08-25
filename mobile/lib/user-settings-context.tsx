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
  // null means "use the app's translated default" — see the
  // fake_call_caller_name column comment in the migration.
  fakeCallCallerName: string | null;
  setShakeSosEnabled: (value: boolean) => void;
  setFakeCallEnabled: (value: boolean) => void;
  setFakeCallCallerName: (value: string | null) => void;
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
  const [fakeCallCallerName, setFakeCallCallerNameState] = useState<string | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || loadedForUserId === userId) return;

    let cancelled = false;
    supabase
      .from('profiles')
      .select('shake_sos_enabled, fake_call_enabled, fake_call_caller_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setShakeSosEnabledState(data.shake_sos_enabled);
          setFakeCallEnabledState(data.fake_call_enabled);
          setFakeCallCallerNameState(data.fake_call_caller_name);
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

  return (
    <UserSettingsContext.Provider
      value={{
        loaded: loadedForUserId === userId && !!userId,
        shakeSosEnabled,
        fakeCallEnabled,
        fakeCallCallerName,
        setShakeSosEnabled,
        setFakeCallEnabled,
        setFakeCallCallerName,
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
