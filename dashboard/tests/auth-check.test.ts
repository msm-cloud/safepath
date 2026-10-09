// A slow or failing auth server must not look like a sign-out (#117). Run
// with `pnpm test:dashboard`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthUnknownError,
  type User,
} from '@supabase/supabase-js';

import { checkAuth, type AuthCheckOptions } from '../lib/auth-check.ts';

const fast: AuthCheckOptions = { attempts: 3, attemptTimeoutMs: 50, retryDelayMs: 1 };
const user = { id: 'user-1' } as User;

function replies(...results: Array<Error | User | 'hang'>) {
  let calls = 0;
  const getUser = async () => {
    const next = results[Math.min(calls++, results.length - 1)];
    if (next === 'hang') return new Promise<never>(() => {});
    if (next instanceof Error) return { data: { user: null }, error: next };
    return { data: { user: next }, error: null };
  };
  return { getUser, calls: () => calls };
}

describe('checkAuth', () => {
  it('returns the user when the check succeeds', async () => {
    const { getUser } = replies(user);
    assert.deepEqual(await checkAuth(getUser, fast), { status: 'signed-in', user });
  });

  it('treats a missing session as signed out without retrying', async () => {
    const { getUser, calls } = replies(new AuthSessionMissingError());
    assert.deepEqual(await checkAuth(getUser, fast), { status: 'signed-out' });
    assert.equal(calls(), 1);
  });

  it('treats a rejected or expired token as signed out', async () => {
    for (const status of [401, 403]) {
      const { getUser } = replies(new AuthApiError('invalid JWT', status, 'bad_jwt'));
      assert.deepEqual(await checkAuth(getUser, fast), { status: 'signed-out' });
    }
  });

  it('retries a network failure and recovers', async () => {
    const { getUser, calls } = replies(new AuthRetryableFetchError('fetch failed', 0), user);
    assert.deepEqual(await checkAuth(getUser, fast), { status: 'signed-in', user });
    assert.equal(calls(), 2);
  });

  it('reports unavailable after every attempt fails', async () => {
    const { getUser, calls } = replies(
      new AuthRetryableFetchError('fetch failed', 0),
      new AuthRetryableFetchError('Bad Gateway', 502),
      new AuthUnknownError('Unexpected token <', null)
    );
    assert.deepEqual(await checkAuth(getUser, fast), { status: 'unavailable' });
    assert.equal(calls(), 3);
  });

  it('gives up on a hanging check after the deadline', async () => {
    const { getUser, calls } = replies('hang');
    const started = Date.now();
    assert.deepEqual(await checkAuth(getUser, fast), { status: 'unavailable' });
    assert.equal(calls(), 3);
    assert.ok(Date.now() - started < 1000);
  });

  it('rethrows unexpected errors', async () => {
    const getUser = async () => {
      throw new TypeError('bug');
    };
    await assert.rejects(checkAuth(getUser, fast), TypeError);
  });
});
