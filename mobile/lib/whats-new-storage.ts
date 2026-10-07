import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SEEN_KEY = 'safepath:whatsNew:lastSeenId';

// Per device, not per account: the note describes the installed app.
// Best-effort both ways — a failed read shows the note again at worst, a
// failed write means it shows once more next launch.
export async function hasSeenWhatsNew(id: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(LAST_SEEN_KEY)) === id;
  } catch {
    return false;
  }
}

export async function markWhatsNewSeen(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SEEN_KEY, id);
  } catch {
    // Best-effort — see comment above.
  }
}
