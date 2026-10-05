import type { EmergencyContact } from '@/lib/sos-trigger';

// The offline SOS fallback has to work on a cold start with no network, so
// the last successful load of the user's emergency contacts (and the name
// the SMS is signed with) is kept on the device, per user. Kept free of
// React Native imports so it can be unit tested under plain Node; the app
// wires it to AsyncStorage and Supabase in lib/sos-contacts.ts.

export type SosContacts = {
  contacts: EmergencyContact[];
  fullName: string | null;
};

export type SosContactsStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
};

export type SosContactsDeps = {
  storage: SosContactsStorage;
  isOnline: () => Promise<boolean>;
  // null when the server couldn't be reached or either query failed.
  fetchRemote: (userId: string) => Promise<SosContacts | null>;
};

export const SOS_CONTACTS_KEY_PREFIX = 'sos-contacts:';

const EMPTY: SosContacts = { contacts: [], fullName: null };

function cacheKey(userId: string): string {
  return SOS_CONTACTS_KEY_PREFIX + userId;
}

function isContact(value: unknown): value is EmergencyContact {
  if (typeof value !== 'object' || value === null) return false;
  const { id, name, phone } = value as Record<string, unknown>;
  return typeof id === 'string' && typeof name === 'string' && typeof phone === 'string';
}

function parseCached(raw: string): SosContacts | null {
  try {
    const parsed = JSON.parse(raw) as { contacts?: unknown; fullName?: unknown };
    if (!Array.isArray(parsed.contacts) || !parsed.contacts.every(isContact)) return null;
    const fullName = typeof parsed.fullName === 'string' ? parsed.fullName : null;
    return { contacts: parsed.contacts, fullName };
  } catch {
    return null;
  }
}

export function createSosContactsStore(deps: SosContactsDeps) {
  async function fetchRemote(userId: string): Promise<SosContacts | null> {
    try {
      return (await deps.isOnline()) ? await deps.fetchRemote(userId) : null;
    } catch {
      return null;
    }
  }

  async function readCache(userId: string): Promise<SosContacts | null> {
    try {
      const raw = await deps.storage.getItem(cacheKey(userId));
      return raw ? parseCached(raw) : null;
    } catch {
      return null;
    }
  }

  // Fresh data when the server answers (and the cache is refreshed with it,
  // including an empty list after the last contact is deleted); otherwise the
  // last cached copy for this user; otherwise nothing.
  async function load(userId: string): Promise<SosContacts> {
    const remote = await fetchRemote(userId);
    if (remote) {
      const fresh: SosContacts = {
        contacts: remote.contacts.map(({ id, name, phone }) => ({ id, name, phone })),
        fullName: remote.fullName,
      };
      try {
        await deps.storage.setItem(cacheKey(userId), JSON.stringify(fresh));
      } catch {
        // A failed write only costs the offline copy; the caller still gets fresh data.
      }
      return fresh;
    }
    return (await readCache(userId)) ?? EMPTY;
  }

  // Removes every user's entry, not just the current one, so nothing from a
  // previous account survives a sign-out on a shared phone.
  async function clear(): Promise<void> {
    const keys = (await deps.storage.getAllKeys()).filter((key) =>
      key.startsWith(SOS_CONTACTS_KEY_PREFIX)
    );
    if (keys.length > 0) await deps.storage.multiRemove(keys);
  }

  return { load, clear };
}
