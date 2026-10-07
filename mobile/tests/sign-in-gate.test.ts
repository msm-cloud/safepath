// Tests for the sign-in role check: the card picked on the welcome screen
// against the account's profiles.role. Supabase is an in-memory fake. Run
// with `pnpm test:mobile`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { personaMatchesRole, type Persona, type ProfileRole } from '../lib/personas.ts';
import { createSignInGate } from '../lib/sign-in-gate.ts';

type FakeSession = { user: { id: string }; token: string };

const GUARDIAN = 'guardian-1';
const STUDENT = 'student-1';
const ROLES: Record<string, ProfileRole> = { [GUARDIAN]: 'guardian', [STUDENT]: 'user' };

// Signs in `userId`: emits the auth event like supabase-js does, before the
// sign-in call resolves, and records what the app would have done.
function fakeAuth(options: { role?: ProfileRole | null } = {}) {
  const admitted: { session: FakeSession; role: ProfileRole }[] = [];
  const routedEvents: (FakeSession | null)[] = [];
  let current: FakeSession | null = null;
  let signOuts = 0;

  const gate = createSignInGate<FakeSession>({
    currentSession: async () => current,
    fetchRole: async (userId) => (options.role !== undefined ? options.role : ROLES[userId]),
    signOutLocal: async () => {
      signOuts += 1;
      current = null;
      emit(null);
    },
    admit: async (session, role) => {
      admitted.push({ session, role });
    },
    matchesRole: personaMatchesRole,
  });

  // The root layout routes every event the gate doesn't park.
  function emit(session: FakeSession | null) {
    if (!gate.park(session)) routedEvents.push(session);
  }

  function signIn(userId: string) {
    return async () => {
      current = { user: { id: userId }, token: 'first' };
      emit(current);
      return { error: null };
    };
  }

  return {
    gate,
    emit,
    signIn,
    admitted,
    routedEvents,
    signOuts: () => signOuts,
    current: () => current,
  };
}

async function signInWithCard(persona: Persona, userId: string) {
  const auth = fakeAuth();
  const result = await auth.gate.signInAs(persona, auth.signIn(userId));
  return { auth, result };
}

describe('sign-in role check: wrong card', () => {
  for (const persona of ['student', 'working'] as const) {
    it(`refuses a guardian account on the ${persona} card and signs it out`, async () => {
      const { auth, result } = await signInWithCard(persona, GUARDIAN);

      assert.deepEqual(result, { kind: 'role_mismatch', role: 'guardian' });
      assert.equal(auth.signOuts(), 1);
      assert.equal(auth.current(), null);
      assert.deepEqual(auth.admitted, []);
      // Neither the sign-in nor the sign-out event reached the router.
      assert.deepEqual(auth.routedEvents, []);
    });
  }

  it('refuses a user account on the guardian card and signs it out', async () => {
    const { auth, result } = await signInWithCard('guardian', STUDENT);

    assert.deepEqual(result, { kind: 'role_mismatch', role: 'user' });
    assert.equal(auth.signOuts(), 1);
    assert.deepEqual(auth.admitted, []);
    assert.deepEqual(auth.routedEvents, []);
  });
});

describe('sign-in role check: right card', () => {
  for (const persona of ['student', 'working'] as const) {
    it(`lets a user account in on the ${persona} card`, async () => {
      const { auth, result } = await signInWithCard(persona, STUDENT);

      assert.deepEqual(result, { kind: 'signed_in', userId: STUDENT });
      assert.equal(auth.signOuts(), 0);
      assert.deepEqual(
        auth.admitted.map(({ session, role }) => [session.user.id, role]),
        [[STUDENT, 'user']]
      );
    });
  }

  it('lets a guardian account in on the guardian card', async () => {
    const { auth, result } = await signInWithCard('guardian', GUARDIAN);

    assert.deepEqual(result, { kind: 'signed_in', userId: GUARDIAN });
    assert.deepEqual(
      auth.admitted.map(({ role }) => role),
      ['guardian']
    );
  });

  it('admits the latest session when it refreshed during the check', async () => {
    const auth = fakeAuth();
    const result = await auth.gate.signInAs('guardian', async () => {
      await auth.signIn(GUARDIAN)();
      auth.emit({ user: { id: GUARDIAN }, token: 'refreshed' });
      return { error: null };
    });

    assert.equal(result.kind, 'signed_in');
    assert.equal(auth.admitted[0]?.session.token, 'refreshed');
  });

  it('routes events normally again once the check is over', async () => {
    const { auth } = await signInWithCard('student', STUDENT);
    auth.emit(null);

    assert.deepEqual(auth.routedEvents, [null]);
  });
});

describe('sign-in role check: other outcomes', () => {
  it('passes a sign-in error through without signing anything out', async () => {
    const auth = fakeAuth();
    const result = await auth.gate.signInAs('student', async () => ({ error: 'Invalid' }));

    assert.deepEqual(result, { kind: 'failed', message: 'Invalid' });
    assert.equal(auth.signOuts(), 0);
  });

  it('reports no session for a sign-up awaiting email confirmation', async () => {
    const auth = fakeAuth();
    const result = await auth.gate.signInAs('guardian', async () => ({ error: null }));

    assert.deepEqual(result, { kind: 'no_session' });
    assert.deepEqual(auth.admitted, []);
  });

  it('signs out instead of guessing when the role cannot be read', async () => {
    const auth = fakeAuth({ role: null });
    const result = await auth.gate.signInAs('student', auth.signIn(STUDENT));

    assert.deepEqual(result, { kind: 'failed', message: null });
    assert.equal(auth.signOuts(), 1);
    assert.deepEqual(auth.admitted, []);
  });

  it('stops parking events after a failed attempt', async () => {
    const auth = fakeAuth();
    await auth.gate.signInAs('student', async () => ({ error: 'Invalid' }));
    auth.emit(null);

    assert.deepEqual(auth.routedEvents, [null]);
  });
});
