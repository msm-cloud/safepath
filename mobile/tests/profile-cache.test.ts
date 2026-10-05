// Tests for the on-device profile cache (language and display settings).
// Storage is an in-memory fake. Run with `pnpm test:mobile`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { KeyValueStorage } from '../lib/key-value-storage.ts';
import {
  createProfileCache,
  DISPLAY_KEY_PREFIX,
  LANGUAGE_KEY_PREFIX,
  type CachedProfileDisplay,
} from '../lib/profile-cache.ts';

const ALICE = 'user-alice';
const BOB = 'user-bob';

const ALICE_DISPLAY: CachedProfileDisplay = {
  fakeCallEnabled: true,
  fakeCallCallerName: 'Mum',
  fullName: 'Alice',
  avatarPath: 'avatars/alice.jpg',
};

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    getAllKeys: async () => [...data.keys()],
    multiRemove: async (keys) => {
      for (const key of keys) data.delete(key);
    },
  };
}

function failingStorage(): KeyValueStorage {
  const fail = async (): Promise<never> => {
    throw new Error('storage unavailable');
  };
  return { getItem: fail, setItem: fail, getAllKeys: fail, multiRemove: fail };
}

describe('profile cache: language', () => {
  it('returns the language that was written', async () => {
    const cache = createProfileCache(memoryStorage());
    await cache.writeLanguage(ALICE, 'en');

    assert.equal(await cache.readLanguage(ALICE), 'en');
  });

  it('returns null when nothing is cached', async () => {
    const cache = createProfileCache(memoryStorage());

    assert.equal(await cache.readLanguage(ALICE), null);
  });

  it('ignores a value that is not a supported language', async () => {
    const storage = memoryStorage();
    storage.data.set(LANGUAGE_KEY_PREFIX + ALICE, 'fr');

    assert.equal(await createProfileCache(storage).readLanguage(ALICE), null);
  });

  it('keeps each user in their own entry', async () => {
    const cache = createProfileCache(memoryStorage());
    await cache.writeLanguage(ALICE, 'en');
    await cache.writeLanguage(BOB, 'bn');

    assert.equal(await cache.readLanguage(ALICE), 'en');
    assert.equal(await cache.readLanguage(BOB), 'bn');
  });
});

describe('profile cache: display settings', () => {
  it('returns the display settings that were written', async () => {
    const cache = createProfileCache(memoryStorage());
    await cache.writeDisplay(ALICE, ALICE_DISPLAY);

    assert.deepEqual(await cache.readDisplay(ALICE), ALICE_DISPLAY);
  });

  it('stores only the display fields', async () => {
    const storage = memoryStorage();
    const withExtra = { ...ALICE_DISPLAY, locationHistoryEnabled: true };
    await createProfileCache(storage).writeDisplay(ALICE, withExtra);

    assert.deepEqual(JSON.parse(storage.data.get(DISPLAY_KEY_PREFIX + ALICE)!), ALICE_DISPLAY);
  });

  it('ignores a corrupt or incomplete entry', async () => {
    const storage = memoryStorage();
    const cache = createProfileCache(storage);

    storage.data.set(DISPLAY_KEY_PREFIX + ALICE, 'not json');
    assert.equal(await cache.readDisplay(ALICE), null);

    storage.data.set(DISPLAY_KEY_PREFIX + ALICE, JSON.stringify({ fullName: 'Alice' }));
    assert.equal(await cache.readDisplay(ALICE), null);
  });

  it('keeps each user in their own entry', async () => {
    const cache = createProfileCache(memoryStorage());
    await cache.writeDisplay(ALICE, ALICE_DISPLAY);

    assert.deepEqual(await cache.readDisplay(ALICE), ALICE_DISPLAY);
    assert.equal(await cache.readDisplay(BOB), null);
  });
});

describe('profile cache: storage failures and sign-out', () => {
  it('treats unreadable or unwritable storage as an empty cache', async () => {
    const cache = createProfileCache(failingStorage());

    await cache.writeLanguage(ALICE, 'en');
    await cache.writeDisplay(ALICE, ALICE_DISPLAY);
    assert.equal(await cache.readLanguage(ALICE), null);
    assert.equal(await cache.readDisplay(ALICE), null);
  });

  it('clears every user on sign-out and leaves other keys alone', async () => {
    const storage = memoryStorage();
    const cache = createProfileCache(storage);
    await cache.writeLanguage(ALICE, 'en');
    await cache.writeDisplay(ALICE, ALICE_DISPLAY);
    await cache.writeLanguage(BOB, 'bn');
    storage.data.set('sos-contacts:user-alice', '{}');

    await cache.clear();

    assert.deepEqual([...storage.data.keys()], ['sos-contacts:user-alice']);
    assert.equal(await cache.readLanguage(ALICE), null);
    assert.equal(await cache.readDisplay(ALICE), null);
  });
});
