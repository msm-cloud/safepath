// Tests for the offline SOS contacts cache. Storage, network state and the
// Supabase fetch are in-memory fakes. Run with `pnpm test:mobile`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSosContactsStore,
  SOS_CONTACTS_KEY_PREFIX,
  type SosContacts,
  type SosContactsStorage,
} from '../lib/sos-contacts-cache.ts';

const ALICE = 'user-alice';
const BOB = 'user-bob';

const ALICE_DATA: SosContacts = {
  contacts: [{ id: 'c1', name: 'Mum', phone: '+8801700000001' }],
  fullName: 'Alice',
};
const BOB_DATA: SosContacts = {
  contacts: [{ id: 'c2', name: 'Dad', phone: '+8801700000002' }],
  fullName: 'Bob',
};

function memoryStorage(): SosContactsStorage & { data: Map<string, string> } {
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

type Remote = Record<string, SosContacts>;

function makeStore(opts: { online?: boolean; remote?: Remote | 'fail' | 'throw' } = {}) {
  const storage = memoryStorage();
  const state = { online: opts.online ?? true, remote: opts.remote ?? {}, fetches: 0 };
  const store = createSosContactsStore({
    storage,
    isOnline: async () => state.online,
    fetchRemote: async (userId) => {
      state.fetches += 1;
      if (state.remote === 'fail') return null;
      if (state.remote === 'throw') throw new Error('Network request failed');
      return state.remote[userId] ?? { contacts: [], fullName: null };
    },
  });
  return { store, storage, state };
}

describe('sos contacts cache', () => {
  it('writes the cache after a successful fetch', async () => {
    const { store, storage } = makeStore({ remote: { [ALICE]: ALICE_DATA } });

    assert.deepEqual(await store.load(ALICE), ALICE_DATA);
    assert.deepEqual(JSON.parse(storage.data.get(SOS_CONTACTS_KEY_PREFIX + ALICE)!), ALICE_DATA);
  });

  it('overwrites the cache with an empty list once contacts are deleted', async () => {
    const { store, storage, state } = makeStore({ remote: { [ALICE]: ALICE_DATA } });
    await store.load(ALICE);

    state.remote = { [ALICE]: { contacts: [], fullName: 'Alice' } };
    await store.load(ALICE);

    state.online = false;
    assert.deepEqual(await store.load(ALICE), { contacts: [], fullName: 'Alice' });
    assert.ok(storage.data.has(SOS_CONTACTS_KEY_PREFIX + ALICE));
  });

  it('uses the cache when offline, without calling the server', async () => {
    const { store, state } = makeStore({ remote: { [ALICE]: ALICE_DATA } });
    await store.load(ALICE);

    state.online = false;
    state.fetches = 0;
    assert.deepEqual(await store.load(ALICE), ALICE_DATA);
    assert.equal(state.fetches, 0);
  });

  it('uses the cache when the fetch fails', async () => {
    const { store, state } = makeStore({ remote: { [ALICE]: ALICE_DATA } });
    await store.load(ALICE);

    state.remote = 'fail';
    assert.deepEqual(await store.load(ALICE), ALICE_DATA);
  });

  it('uses the cache when the fetch throws', async () => {
    const { store, state } = makeStore({ remote: { [ALICE]: ALICE_DATA } });
    await store.load(ALICE);

    state.remote = 'throw';
    assert.deepEqual(await store.load(ALICE), ALICE_DATA);
  });

  it('returns no contacts when offline with nothing cached', async () => {
    const { store } = makeStore({ online: false });

    assert.deepEqual(await store.load(ALICE), { contacts: [], fullName: null });
  });

  it('ignores a corrupt cache entry', async () => {
    const { store, storage } = makeStore({ remote: 'fail' });
    storage.data.set(SOS_CONTACTS_KEY_PREFIX + ALICE, '{"contacts":[{"id":1}]}');

    assert.deepEqual(await store.load(ALICE), { contacts: [], fullName: null });
  });

  it('keeps each user in their own cache entry', async () => {
    const { store, state } = makeStore({ remote: { [ALICE]: ALICE_DATA, [BOB]: BOB_DATA } });
    await store.load(ALICE);
    await store.load(BOB);

    state.online = false;
    assert.deepEqual(await store.load(ALICE), ALICE_DATA);
    assert.deepEqual(await store.load(BOB), BOB_DATA);
    assert.deepEqual(await store.load('user-carol'), { contacts: [], fullName: null });
  });

  it('clears every cached user on sign-out and leaves other keys alone', async () => {
    const { store, storage, state } = makeStore({
      remote: { [ALICE]: ALICE_DATA, [BOB]: BOB_DATA },
    });
    await store.load(ALICE);
    await store.load(BOB);
    storage.data.set('onboarding:user-alice', '1');

    await store.clear();

    assert.deepEqual([...storage.data.keys()], ['onboarding:user-alice']);
    state.online = false;
    assert.deepEqual(await store.load(ALICE), { contacts: [], fullName: null });
  });
});
