import type { KeyValueStorage } from '@/lib/key-value-storage';
import type { ProfileRole } from '@/lib/personas';
import type { Language } from '@/lib/translations';

// Last known profile values, kept on the device per user so a cold start
// without network shows the person's own language, name and Fake Call
// card instead of defaults, and the role so it opens the right home.
// Otherwise display only: settings that drive something (location-history
// recording, shake detection) still wait for the server. Free of React Native imports so it can be unit tested under
// plain Node; the app binds it to AsyncStorage in lib/device-profile-cache.ts.

export type CachedProfileDisplay = {
  fakeCallEnabled: boolean;
  fakeCallCallerName: string | null;
  fullName: string | null;
  avatarPath: string | null;
};

export const LANGUAGE_KEY_PREFIX = 'profile-language:';
export const DISPLAY_KEY_PREFIX = 'profile-display:';
export const ROLE_KEY_PREFIX = 'profile-role:';

const PREFIXES = [LANGUAGE_KEY_PREFIX, DISPLAY_KEY_PREFIX, ROLE_KEY_PREFIX];

function isLanguage(value: unknown): value is Language {
  return value === 'bn' || value === 'en';
}

function isRole(value: unknown): value is ProfileRole {
  return value === 'user' || value === 'guardian';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseDisplay(raw: string): CachedProfileDisplay | null {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const { fakeCallEnabled, fakeCallCallerName, fullName, avatarPath } = value;
    if (
      typeof fakeCallEnabled !== 'boolean' ||
      !isNullableString(fakeCallCallerName) ||
      !isNullableString(fullName) ||
      !isNullableString(avatarPath)
    ) {
      return null;
    }
    return { fakeCallEnabled, fakeCallCallerName, fullName, avatarPath };
  } catch {
    return null;
  }
}

// Every method swallows storage errors: a missing or unreadable cache only
// means falling back to the defaults, as before the cache existed.
export function createProfileCache(storage: KeyValueStorage) {
  async function read(key: string): Promise<string | null> {
    try {
      return await storage.getItem(key);
    } catch {
      return null;
    }
  }

  async function write(key: string, value: string): Promise<void> {
    try {
      await storage.setItem(key, value);
    } catch {
      // The next successful load writes it again.
    }
  }

  return {
    async readLanguage(userId: string): Promise<Language | null> {
      const raw = await read(LANGUAGE_KEY_PREFIX + userId);
      return isLanguage(raw) ? raw : null;
    },

    writeLanguage(userId: string, language: Language): Promise<void> {
      return write(LANGUAGE_KEY_PREFIX + userId, language);
    },

    // Lets an offline cold start route to the right home; see
    // resolveSessionRole in lib/personas.ts.
    async readRole(userId: string): Promise<ProfileRole | null> {
      const raw = await read(ROLE_KEY_PREFIX + userId);
      return isRole(raw) ? raw : null;
    },

    writeRole(userId: string, role: ProfileRole): Promise<void> {
      return write(ROLE_KEY_PREFIX + userId, role);
    },

    async readDisplay(userId: string): Promise<CachedProfileDisplay | null> {
      const raw = await read(DISPLAY_KEY_PREFIX + userId);
      return raw ? parseDisplay(raw) : null;
    },

    writeDisplay(userId: string, display: CachedProfileDisplay): Promise<void> {
      const { fakeCallEnabled, fakeCallCallerName, fullName, avatarPath } = display;
      return write(
        DISPLAY_KEY_PREFIX + userId,
        JSON.stringify({ fakeCallEnabled, fakeCallCallerName, fullName, avatarPath })
      );
    },

    // Removes every user's entries, so nothing from a previous account
    // survives a sign-out on a shared phone.
    async clear(): Promise<void> {
      const keys = (await storage.getAllKeys()).filter((key) =>
        PREFIXES.some((prefix) => key.startsWith(prefix))
      );
      if (keys.length > 0) await storage.multiRemove(keys);
    },
  };
}
