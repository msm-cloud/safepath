// Tests for the auth state the root layout routes on: token refreshes and
// app resumes must never unmount the navigator, so an SOS, journey, live
// sharing or fake call survives them. Supabase and the device cache are
// in-memory fakes. Run with `pnpm test:mobile`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createAuthSession,
  rootRoute,
  type AuthSnapshot,
  type RootRoute,
} from '../lib/auth-session.ts';
import { resolveSessionRole, type ProfileRole } from '../lib/personas.ts';

type FakeSession = { user: { id: string }; token: string };

const STUDENT = 'student-1';
const GUARDIAN = 'guardian-1';
const ROLES: Record<string, ProfileRole> = { [STUDENT]: 'user', [GUARDIAN]: 'guardian' };

type Network = 'online' | 'offline' | 'slow';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function fakeApp(options: { cached?: Record<string, ProfileRole> } = {}) {
  const cache = new Map(Object.entries(options.cached ?? {}));
  const routes: RootRoute[] = [];
  const pending: (() => void)[] = [];
  let network: Network = 'online';
  let fetches = 0;

  const auth = createAuthSession<FakeSession>({
    fetchRole: async (userId) => {
      fetches += 1;
      if (network === 'offline') return null;
      if (network === 'slow') {
        const gate = deferred<void>();
        pending.push(gate.resolve);
        await gate.promise;
      }
      return ROLES[userId] ?? null;
    },
    readCachedRole: async (userId) => cache.get(userId) ?? null,
    writeCachedRole: async (userId, role) => {
      cache.set(userId, role);
    },
    resolveRole: resolveSessionRole,
    publish: (snapshot: AuthSnapshot<FakeSession>) => routes.push(rootRoute(snapshot)),
  });

  let token = 0;
  const session = (userId: string): FakeSession => ({ user: { id: userId }, token: `t${++token}` });

  return {
    auth,
    routes,
    cache,
    session,
    setNetwork: (next: Network) => {
      network = next;
    },
    fetches: () => fetches,
    // Lets every slow role fetch answer.
    settle: async () => {
      for (const release of pending.splice(0)) release();
      await new Promise((r) => setImmediate(r));
    },
    route: () => rootRoute(auth.snapshot()),
  };
}

async function signedIn(userId: string) {
  const app = fakeApp();
  await app.auth.apply(app.session(userId));
  return app;
}

// Everything published after `from`: the navigator stays mounted only if
// none of it is the splash or another group.
function routesSince(app: ReturnType<typeof fakeApp>, from: number) {
  return app.routes.slice(from);
}

const ACTIVITIES: { name: string; userId: string; home: RootRoute }[] = [
  { name: 'an active SOS', userId: STUDENT, home: 'user' },
  { name: 'an active journey', userId: STUDENT, home: 'user' },
  { name: 'live sharing (student)', userId: STUDENT, home: 'user' },
  { name: 'live sharing (guardian)', userId: GUARDIAN, home: 'guardian' },
  { name: 'the fake call screen', userId: STUDENT, home: 'user' },
];

describe('first auth resolution', () => {
  it('holds the splash until the role is known, then routes once', async () => {
    const app = fakeApp();
    assert.equal(app.route(), 'splash');
    await app.auth.apply(app.session(GUARDIAN));

    assert.deepEqual(app.routes, ['guardian']);
    assert.equal(app.cache.get(GUARDIAN), 'guardian');
  });

  it('goes straight to the welcome screen with no session', async () => {
    const app = fakeApp();
    await app.auth.apply(null);

    assert.deepEqual(app.routes, ['auth']);
  });

  it('uses the cached role when the fetch fails on start', async () => {
    const app = fakeApp({ cached: { [GUARDIAN]: 'guardian' } });
    app.setNetwork('offline');
    await app.auth.apply(app.session(GUARDIAN));

    assert.deepEqual(app.routes, ['guardian']);
  });

  it("falls back to the student home when there's no fetch and no cache", async () => {
    const app = fakeApp();
    app.setNetwork('offline');
    await app.auth.apply(app.session(GUARDIAN));

    assert.deepEqual(app.routes, ['user']);
    // The guess isn't cached, so it can't stick on later offline starts.
    assert.equal(app.cache.has(GUARDIAN), false);
  });

  it('corrects that fallback on the next refresh that reaches the server', async () => {
    const app = fakeApp();
    app.setNetwork('offline');
    await app.auth.apply(app.session(GUARDIAN));
    app.setNetwork('online');
    await app.auth.apply(app.session(GUARDIAN));

    assert.deepEqual(app.routes, ['user', 'user', 'guardian']);
    assert.equal(app.cache.get(GUARDIAN), 'guardian');
  });

  it('lets the latest event win when two arrive before the role is known', async () => {
    const app = fakeApp();
    app.setNetwork('slow');
    const first = app.auth.apply(app.session(STUDENT));
    const refreshed = app.session(STUDENT);
    const second = app.auth.apply(refreshed);
    await app.settle();
    await Promise.all([first, second]);

    assert.deepEqual(app.routes, ['user']);
    assert.equal(app.auth.snapshot().session, refreshed);
  });
});

for (const activity of ACTIVITIES) {
  describe(`TOKEN_REFRESHED during ${activity.name}`, () => {
    it('keeps the navigator mounted and swaps in the new tokens', async () => {
      const app = await signedIn(activity.userId);
      const from = app.routes.length;
      const refreshed = app.session(activity.userId);
      await app.auth.apply(refreshed);

      assert.ok(
        routesSince(app, from).every((r) => r === activity.home),
        routesSince(app, from).join()
      );
      assert.equal(app.auth.snapshot().session, refreshed);
      assert.equal(app.auth.snapshot().loading, false);
    });

    it('stays on the same screen while the role re-check is slow', async () => {
      const app = await signedIn(activity.userId);
      app.setNetwork('slow');
      const from = app.routes.length;
      const refreshed = app.session(activity.userId);
      const applying = app.auth.apply(refreshed);

      // Before the server answers: tokens are already live, nothing moved.
      await new Promise((r) => setImmediate(r));
      assert.equal(app.route(), activity.home);
      assert.equal(app.auth.snapshot().session, refreshed);

      await app.settle();
      await applying;
      assert.ok(routesSince(app, from).every((r) => r === activity.home));
    });

    it('keeps the role when the re-check fails offline', async () => {
      const app = await signedIn(activity.userId);
      app.setNetwork('offline');
      const from = app.routes.length;
      await app.auth.apply(app.session(activity.userId));

      assert.ok(routesSince(app, from).every((r) => r === activity.home));
      assert.equal(app.auth.snapshot().role, ROLES[activity.userId]);
    });

    it('survives repeated refreshes', async () => {
      const app = await signedIn(activity.userId);
      const from = app.routes.length;
      for (let i = 0; i < 5; i++) await app.auth.apply(app.session(activity.userId));

      assert.ok(routesSince(app, from).every((r) => r === activity.home));
    });
  });
}

describe('app resume after a long background', () => {
  for (const activity of ACTIVITIES) {
    it(`keeps ${activity.name} mounted through the resume burst`, async () => {
      const app = await signedIn(activity.userId);
      app.setNetwork('slow');
      const from = app.routes.length;

      // supabase-js re-emits the session and then refreshes the expired
      // token, both before the network is really back.
      const signedInAgain = app.auth.apply(app.session(activity.userId));
      const refreshed = app.auth.apply(app.session(activity.userId));
      await new Promise((r) => setImmediate(r));
      assert.equal(app.route(), activity.home);

      await app.settle();
      await Promise.all([signedInAgain, refreshed]);
      assert.ok(routesSince(app, from).every((r) => r === activity.home));
      assert.equal(app.fetches(), 3);
    });
  }

  it('returns to the welcome screen when the refresh token was revoked', async () => {
    const app = await signedIn(STUDENT);
    await app.auth.apply(null);

    assert.equal(app.route(), 'auth');
    assert.deepEqual(app.auth.snapshot(), { session: null, role: null, loading: false });
  });
});

describe('SIGNED_OUT', () => {
  it('clears the session and role and routes to the welcome screen', async () => {
    const app = await signedIn(GUARDIAN);
    await app.auth.apply(null);

    assert.deepEqual(app.auth.snapshot(), { session: null, role: null, loading: false });
    assert.deepEqual(app.routes, ['guardian', 'auth']);
  });

  it("isn't undone by a role re-check still in flight", async () => {
    const app = await signedIn(STUDENT);
    app.setNetwork('slow');
    const refreshing = app.auth.apply(app.session(STUDENT));
    await app.auth.apply(null);
    await app.settle();
    await refreshing;

    assert.equal(app.route(), 'auth');
    assert.equal(app.auth.snapshot().role, null);
  });

  it("isn't undone by a first resolution still in flight", async () => {
    const app = fakeApp();
    app.setNetwork('slow');
    const starting = app.auth.apply(app.session(STUDENT));
    await app.auth.apply(null);
    await app.settle();
    await starting;

    assert.deepEqual(app.routes, ['auth']);
  });
});

describe('a different account signing in', () => {
  it('routes the new account without passing through the splash', async () => {
    const app = await signedIn(STUDENT);
    await app.auth.apply(null);
    await app.auth.apply(app.session(GUARDIAN), 'guardian');

    assert.deepEqual(app.routes, ['user', 'auth', 'guardian']);
  });

  it('keeps the current screen until the new role is known', async () => {
    const app = fakeApp();
    await app.auth.apply(null);
    app.setNetwork('slow');
    const applying = app.auth.apply(app.session(GUARDIAN));

    await new Promise((r) => setImmediate(r));
    assert.equal(app.route(), 'auth');

    await app.settle();
    await applying;
    assert.deepEqual(app.routes, ['auth', 'guardian']);
  });
});
