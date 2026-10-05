import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { profileCache } from '@/lib/device-profile-cache';
import { supabase } from '@/lib/supabase';
import type { Database } from '@safepath/shared-types';

// 'loading'  — first fetch in flight (or the one retry for a missing row).
// 'retrying' — the fetch failed; retrying with backoff and on foreground.
// 'missing'  — the request worked but the account has no profile row.
//              Only the sign-up trigger creates it, so nothing on this
//              device can fix it; retried on the next app start only.
// 'loaded'   — the saved values are in.
export type SettingsLoadState = 'loading' | 'retrying' | 'missing' | 'loaded';

type UserSettingsContextValue = {
  // True only once the saved values are in. Until then every value below
  // is a default, so consumers (the Fake Call button, the shake listener,
  // the location-history reconcile) must not act on them.
  loaded: boolean;
  loadState: SettingsLoadState;
  // True once the values below are the person's own, either from the
  // server or from the on-device copy of the last load (see
  // lib/profile-cache.ts). Only the display values are restored from that
  // copy — fakeCallEnabled, fakeCallCallerName, fullName, avatarPath — so
  // this is for showing them offline, never a substitute for `loaded`.
  displayReady: boolean;
  shakeSosEnabled: boolean;
  fakeCallEnabled: boolean;
  // Guardian-only device preference — whether a new SOS alert plays
  // looping sound + repeating haptics on THIS device (the alert screens'
  // full-screen flash is unconditional). Meaningless for role = 'user'
  // accounts; see the migration comment for why this isn't the at-risk
  // user's own setting. Defaults to true — see setter below.
  alarmSoundEnabled: boolean;
  // Whether this device records a ~5-minute location-history trail (the
  // "Recorded Live Location" feature). Account-level like the others so it
  // survives reinstall; the toggle itself lives on the Home screen and is
  // driven through use-location-history.ts, which also reconciles the
  // background task. Off by default.
  locationHistoryEnabled: boolean;
  // null means "use the app's translated default" — see the
  // fake_call_caller_name column comment in the migration.
  fakeCallCallerName: string | null;
  // Read-only here — null for any account created while "Confirm email"
  // was on before phone got wired into handle_new_user() (see the
  // phone-login migration's own comment), or for a signup that happened
  // to race a duplicate. SettingsScreen.tsx is where this actually gets
  // set/fixed, not this context: saving a phone number has its own
  // user-facing failure mode (already taken) that the screen handles.
  phone: string | null;
  // The signed-in user's own display name and profile-photo path — read
  // here for the avatar shown on their own screens (Settings header, Home
  // header, guardian header). full_name is edited on the dashboard, not
  // in the mobile app; avatar_url is set via SettingsScreen (see
  // setAvatarPathLocal). Both null until `displayReady`.
  fullName: string | null;
  avatarPath: string | null;
  // Every setter below updates local state at once, awaits the write and
  // resolves to whether it persisted. On failure the local value is rolled
  // back before it resolves, so the caller only has to tell the person.
  setShakeSosEnabled: (value: boolean) => Promise<boolean>;
  setFakeCallEnabled: (value: boolean) => Promise<boolean>;
  setAlarmSoundEnabled: (value: boolean) => Promise<boolean>;
  // Location history also drives an OS background task and a
  // guardian-visible "recording" state; see use-location-history.ts.
  setLocationHistoryEnabled: (value: boolean) => Promise<boolean>;
  setFakeCallCallerName: (value: string | null) => Promise<boolean>;
  // Updates only the in-memory value, once SettingsScreen has confirmed
  // its own write actually succeeded.
  setPhoneLocal: (value: string | null) => void;
  // Same idea as setPhoneLocal: SettingsScreen owns the storage upload +
  // profiles.avatar_url write (real, user-facing failure modes), then
  // syncs the confirmed value back into context for the app-wide avatar.
  setAvatarPathLocal: (value: string | null) => void;
};

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

type ProfileSettingsUpdate = Pick<
  Database['public']['Tables']['profiles']['Update'],
  'shake_sos_enabled' | 'fake_call_enabled' | 'fake_call_caller_name' | 'alarm_sound_enabled'
>;

const PROFILE_SETTINGS_COLUMNS =
  'shake_sos_enabled, fake_call_enabled, fake_call_caller_name, alarm_sound_enabled, location_history_enabled, phone, full_name, avatar_url';

// Backoff after a failed fetch; the last delay repeats until it succeeds.
const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000];
// A row missing right after sign-up can be the trigger still committing,
// so a missing row gets one retry before it is reported.
const MISSING_ROW_RETRY_MS = 3_000;

// Supabase query builders only send the request once awaited, so a write
// that is built but not awaited never reaches the database.
async function saveProfileSettings(
  userId: string,
  update: ProfileSettingsUpdate
): Promise<boolean> {
  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  return !error;
}

// Same shape/reasoning as LanguageProvider (see language-context.tsx):
// profiles columns, not local device storage, so these safety-feature
// settings survive a reinstall or a new device rather than silently
// resetting. Local state updates first so toggles feel instant.
export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [shakeSosEnabled, setShakeSosEnabledState] = useState(false);
  const [fakeCallEnabled, setFakeCallEnabledState] = useState(true);
  const [alarmSoundEnabled, setAlarmSoundEnabledState] = useState(true);
  const [locationHistoryEnabled, setLocationHistoryEnabledState] = useState(false);
  const [fakeCallCallerName, setFakeCallCallerNameState] = useState<string | null>(null);
  const [phone, setPhoneState] = useState<string | null>(null);
  const [fullName, setFullNameState] = useState<string | null>(null);
  const [avatarPath, setAvatarPathState] = useState<string | null>(null);
  // Keyed by user so a previous account's state never counts as loaded
  // for the next one.
  const [load, setLoad] = useState<{ userId: string; state: SettingsLoadState } | null>(null);
  const [restoredForUserId, setRestoredForUserId] = useState<string | null>(null);

  // A failed fetch must never fall back to the defaults: the location
  // history reconcile treats `locationHistoryEnabled` as the truth and
  // would stop recording. So `loaded` only turns true on a real row, and
  // failures retry until one arrives.
  useEffect(() => {
    if (!userId) return;
    const id = userId;

    let cancelled = false;
    let inFlight = false;
    let failures = 0;
    let missingRetried = false;
    let state: SettingsLoadState = 'loading';
    let timer: ReturnType<typeof setTimeout> | null = null;

    const report = (next: SettingsLoadState) => {
      state = next;
      setLoad({ userId: id, state: next });
    };

    const retryIn = (ms: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void fetchSettings(), ms);
    };

    async function fetchSettings() {
      if (cancelled || inFlight) return;
      inFlight = true;
      timer = null;
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SETTINGS_COLUMNS)
        .eq('id', id)
        .maybeSingle();
      inFlight = false;
      if (cancelled) return;

      if (data) {
        setShakeSosEnabledState(data.shake_sos_enabled);
        setFakeCallEnabledState(data.fake_call_enabled);
        setFakeCallCallerNameState(data.fake_call_caller_name);
        setAlarmSoundEnabledState(data.alarm_sound_enabled);
        setLocationHistoryEnabledState(data.location_history_enabled);
        setPhoneState(data.phone);
        setFullNameState(data.full_name);
        setAvatarPathState(data.avatar_url);
        report('loaded');
        return;
      }

      if (error) {
        report('retrying');
        retryIn(RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)]);
        failures += 1;
        return;
      }

      if (!missingRetried) {
        missingRetried = true;
        retryIn(MISSING_ROW_RETRY_MS);
        return;
      }
      report('missing');
    }

    // Display values from the last successful load, for an offline start.
    // Skipped if the server has already answered.
    async function restoreDisplayValues() {
      const cached = await profileCache.readDisplay(id);
      if (cancelled || !cached || state === 'loaded') return;
      setFakeCallEnabledState(cached.fakeCallEnabled);
      setFakeCallCallerNameState(cached.fakeCallCallerName);
      setFullNameState(cached.fullName);
      setAvatarPathState(cached.avatarPath);
      setRestoredForUserId(id);
    }

    report('loading');
    void restoreDisplayValues();
    void fetchSettings();

    // Coming back online usually coincides with coming back to the app,
    // so a pending retry runs at once instead of waiting out its delay.
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && state === 'retrying') {
        if (timer) clearTimeout(timer);
        void fetchSettings();
      }
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [userId]);

  const loadState: SettingsLoadState = load && load.userId === userId ? load.state : 'loading';

  // Refreshes the on-device copy whenever the confirmed display values
  // change, from a load or from one of the setters below.
  useEffect(() => {
    if (!userId || loadState !== 'loaded') return;
    void profileCache.writeDisplay(userId, {
      fakeCallEnabled,
      fakeCallCallerName,
      fullName,
      avatarPath,
    });
  }, [userId, loadState, fakeCallEnabled, fakeCallCallerName, fullName, avatarPath]);

  const setShakeSosEnabled = useCallback(
    async (value: boolean): Promise<boolean> => {
      setShakeSosEnabledState(value);
      if (!userId) return true;
      const saved = await saveProfileSettings(userId, { shake_sos_enabled: value });
      // Roll back only if nothing changed the value in the meantime.
      if (!saved) setShakeSosEnabledState((current) => (current === value ? !value : current));
      return saved;
    },
    [userId]
  );

  const setFakeCallEnabled = useCallback(
    async (value: boolean): Promise<boolean> => {
      setFakeCallEnabledState(value);
      if (!userId) return true;
      const saved = await saveProfileSettings(userId, { fake_call_enabled: value });
      if (!saved) setFakeCallEnabledState((current) => (current === value ? !value : current));
      return saved;
    },
    [userId]
  );

  const setFakeCallCallerName = useCallback(
    async (value: string | null): Promise<boolean> => {
      const previous = fakeCallCallerName;
      setFakeCallCallerNameState(value);
      if (!userId) return true;
      const saved = await saveProfileSettings(userId, { fake_call_caller_name: value });
      if (!saved) setFakeCallCallerNameState((current) => (current === value ? previous : current));
      return saved;
    },
    [userId, fakeCallCallerName]
  );

  const setAlarmSoundEnabled = useCallback(
    async (value: boolean): Promise<boolean> => {
      setAlarmSoundEnabledState(value);
      if (!userId) return true;
      const saved = await saveProfileSettings(userId, { alarm_sound_enabled: value });
      if (!saved) setAlarmSoundEnabledState((current) => (current === value ? !value : current));
      return saved;
    },
    [userId]
  );

  const setLocationHistoryEnabled = useCallback(
    async (value: boolean): Promise<boolean> => {
      setLocationHistoryEnabledState(value);
      if (!userId) return true;

      const { error } = await supabase
        .from('profiles')
        .update({ location_history_enabled: value })
        .eq('id', userId);

      if (error) {
        // Roll the optimistic flip back — but only if nothing else changed
        // the value in the meantime (a concurrent toggle / reconcile).
        setLocationHistoryEnabledState((current) => (current === value ? !value : current));
        return false;
      }
      return true;
    },
    [userId]
  );

  return (
    <UserSettingsContext.Provider
      value={{
        loaded: !!userId && loadState === 'loaded',
        loadState,
        displayReady: !!userId && (loadState === 'loaded' || restoredForUserId === userId),
        shakeSosEnabled,
        fakeCallEnabled,
        fakeCallCallerName,
        alarmSoundEnabled,
        locationHistoryEnabled,
        phone,
        fullName,
        avatarPath,
        setShakeSosEnabled,
        setFakeCallEnabled,
        setFakeCallCallerName,
        setAlarmSoundEnabled,
        setLocationHistoryEnabled,
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
