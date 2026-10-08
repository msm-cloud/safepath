import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseStoredPrefs, type FakeCallPrefs } from '@/lib/fake-call';

const KEY_PREFIX = 'safepath:fakeCall:';

// The last caller choice and ring mode, on this device only and per account.
// Best-effort: a storage failure only means the screen opens on the
// defaults, never that the call can't be started.
export async function loadFakeCallPrefs(userId: string): Promise<Partial<FakeCallPrefs> | null> {
  try {
    return parseStoredPrefs(await AsyncStorage.getItem(KEY_PREFIX + userId));
  } catch {
    return null;
  }
}

export async function saveFakeCallPrefs(userId: string, prefs: FakeCallPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PREFIX + userId, JSON.stringify(prefs));
  } catch {
    // Best-effort — see comment above.
  }
}
