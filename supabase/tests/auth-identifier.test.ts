// Tests for the auth-identifier edge function's request handling. Supabase
// calls are replaced with in-memory fakes. Run with `pnpm test:auth-identifier`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clientIp,
  createHandler,
  DUMMY_EMAIL,
  LIMITS,
  normalizePhone,
  RESET_MESSAGE,
  secretsMatch,
  type Bucket,
  type Deps,
  type SignInResult,
} from '../functions/auth-identifier/handler.ts';

const KNOWN_PHONE = '+8801711000999';
const KNOWN_EMAIL = 'guardian@example.com';
const PASSWORD = 'correct-horse';
const SALT = 'test-salt';
const FORWARD_SECRET = 'dashboard-forward-secret';

// Node timers can fire a fraction of a millisecond before performance.now()
// says the delay has passed, so floor checks allow this much slack.
const TIMER_SLACK_MS = 1;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Fake = {
  deps: Deps;
  signInCalls: string[];
  resetCalls: { email: string; redirectTo: string | undefined }[];
  limiterKeys: { bucket: Bucket; keyHash: string }[];
};

function makeFake(overrides: Partial<Deps> = {}): Fake {
  const events = new Map<string, number[]>();
  const signInCalls: string[] = [];
  const resetCalls: Fake['resetCalls'] = [];
  const limiterKeys: Fake['limiterKeys'] = [];

  const deps: Deps = {
    lookupEmail: async (phone) => {
      await delay(1);
      return phone === KNOWN_PHONE ? KNOWN_EMAIL : null;
    },
    signInWithPassword: async (email, password): Promise<SignInResult> => {
      signInCalls.push(email);
      await delay(1);
      if (email === KNOWN_EMAIL && password === PASSWORD) {
        const session = {
          access_token: 'access',
          refresh_token: 'refresh',
          expires_in: 3600,
          expires_at: 1_900_000_000,
          token_type: 'bearer',
          user: { email: KNOWN_EMAIL },
        };
        return { kind: 'ok', session };
      }
      return { kind: 'invalid_credentials' };
    },
    sendPasswordReset: async (email, redirectTo) => {
      resetCalls.push({ email, redirectTo });
    },
    // Check-and-record happens synchronously, like the locked SQL function;
    // the delay afterwards stands in for the network round trip.
    rateLimitHit: async (bucket, keyHash, windowSecs, max) => {
      limiterKeys.push({ bucket, keyHash });
      const key = `${bucket}:${keyHash}`;
      const now = Date.now();
      const recent = (events.get(key) ?? []).filter((t) => t > now - windowSecs * 1000);
      let wait = 0;
      if (recent.length >= max) {
        wait = Math.ceil((recent[0] + windowSecs * 1000 - now) / 1000);
      } else {
        recent.push(now);
      }
      events.set(key, recent);
      await delay(1);
      return wait;
    },
    hashSalt: SALT,
    forwardSecret: FORWARD_SECRET,
    minResponseMs: 0,
    jitterMs: 0,
    now: () => performance.now(),
    sleep: delay,
    random: Math.random,
    ...overrides,
  };

  return { deps, signInCalls, resetCalls, limiterKeys };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/auth-identifier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.1', ...headers },
    body: JSON.stringify(body),
  });
}

async function send(deps: Deps, request: Request) {
  const started = performance.now();
  const res = await createHandler(deps)(request);
  const elapsed = performance.now() - started;
  return { status: res.status, headers: res.headers, text: await res.text(), elapsed };
}

const signIn = (phone: string, password: string, headers?: Record<string, string>) =>
  post({ action: 'sign-in', phone, password }, headers);
const reset = (phone: string, redirectTo?: string) => post({ action: 'reset', phone, redirectTo });

describe('sign-in', () => {
  it('returns byte-identical responses for an unknown phone and a wrong password', async () => {
    const unknown = await send(makeFake().deps, signIn('+8801711000000', PASSWORD));
    const wrong = await send(makeFake().deps, signIn(KNOWN_PHONE, 'wrong-password'));

    assert.equal(unknown.status, 400);
    assert.equal(wrong.status, 400);
    assert.equal(unknown.text, wrong.text);
    assert.deepEqual([...unknown.headers], [...wrong.headers]);
  });

  it('still calls GoTrue with a dummy email for an unknown phone', async () => {
    const fake = makeFake();
    await send(fake.deps, signIn('+8801711000000', PASSWORD));
    assert.deepEqual(fake.signInCalls, [DUMMY_EMAIL]);
  });

  it('returns only the token fields on success, never the email', async () => {
    const res = await send(makeFake().deps, signIn('+880 1711-000999', PASSWORD));

    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.text), {
      session: {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        expires_at: 1_900_000_000,
        token_type: 'bearer',
      },
    });
    assert.ok(!res.text.includes(KNOWN_EMAIL));
  });

  it('reports an unconfirmed email only when the password was correct', async () => {
    const fake = makeFake({
      signInWithPassword: async () => ({ kind: 'email_not_confirmed' }),
    });
    const known = await send(fake.deps, signIn(KNOWN_PHONE, PASSWORD));
    const unknown = await send(fake.deps, signIn('+8801711000000', PASSWORD));

    assert.equal(known.status, 403);
    assert.equal(unknown.status, 400);
  });

  it('never includes the email in any response', async () => {
    const fake = makeFake();
    const responses = [
      await send(fake.deps, signIn(KNOWN_PHONE, PASSWORD)),
      await send(fake.deps, signIn(KNOWN_PHONE, 'wrong-password')),
      await send(fake.deps, reset(KNOWN_PHONE)),
    ];
    for (let i = 0; i < 5; i++) responses.push(await send(fake.deps, signIn(KNOWN_PHONE, 'x')));

    for (const res of responses) assert.ok(!res.text.includes(KNOWN_EMAIL), res.text);
  });

  it('gives exactly one 429 for N+1 parallel attempts on one phone', async () => {
    const fake = makeFake();
    const attempts = LIMITS.signin.max + 1;
    const results = await Promise.all(
      Array.from({ length: attempts }, (_, i) =>
        send(
          fake.deps,
          signIn(KNOWN_PHONE, 'wrong-password', { 'cf-connecting-ip': `203.0.113.${i}` })
        )
      )
    );

    assert.equal(results.filter((r) => r.status === 429).length, 1);
    assert.equal(results.filter((r) => r.status === 400).length, LIMITS.signin.max);
  });

  it('counts successful sign-ins toward the per-phone limit', async () => {
    const fake = makeFake();
    for (let i = 0; i < LIMITS.signin.max; i++) {
      assert.equal((await send(fake.deps, signIn(KNOWN_PHONE, PASSWORD))).status, 200);
    }
    assert.equal((await send(fake.deps, signIn(KNOWN_PHONE, PASSWORD))).status, 429);
  });

  it('shares the per-phone limit across formatting variants', async () => {
    const fake = makeFake();
    const formats = ['+8801711000999', '+880 1711 000999', '+880-1711-000999'];
    for (let i = 0; i < LIMITS.signin.max; i++) {
      await send(fake.deps, signIn(formats[i % formats.length], 'wrong-password'));
    }
    assert.equal(
      (await send(fake.deps, signIn('+880 1711-000 999', 'wrong-password'))).status,
      429
    );
  });

  it('treats local, 880 and 00880 forms as the same phone', async () => {
    const fake = makeFake();
    const formats = [
      '01711000999',
      '8801711000999',
      '00880 1711-000999',
      '(+880) 1711 000999',
      '01711-000999',
    ];
    assert.equal(formats.length, LIMITS.signin.max);
    for (const phone of formats) {
      assert.equal((await send(fake.deps, signIn(phone, PASSWORD))).status, 200);
    }
    assert.equal((await send(fake.deps, signIn(KNOWN_PHONE, PASSWORD))).status, 429);
  });

  it('returns 429 with Retry-After for an IP over its limit', async () => {
    const fake = makeFake();
    for (let i = 0; i < LIMITS.ip.max; i++) {
      await send(fake.deps, signIn(`+88017110${String(i).padStart(5, '0')}`, 'x'));
    }
    const res = await send(fake.deps, signIn('+8801799999999', 'x'));

    assert.equal(res.status, 429);
    assert.equal(JSON.parse(res.text).message, 'Too many attempts, try later');
    const retryAfter = Number(res.headers.get('Retry-After'));
    assert.ok(retryAfter > 0 && retryAfter <= LIMITS.ip.windowSecs);
  });

  it('passes GoTrue rate limiting through as a 429', async () => {
    const fake = makeFake({
      signInWithPassword: async () => ({ kind: 'rate_limited', retryAfterSecs: 42 }),
    });
    const res = await send(fake.deps, signIn(KNOWN_PHONE, PASSWORD));
    assert.equal(res.status, 429);
    assert.equal(res.headers.get('Retry-After'), '42');
  });

  it('stores only hashes of the phone and IP', async () => {
    const fake = makeFake();
    await send(fake.deps, signIn(KNOWN_PHONE, PASSWORD));

    assert.deepEqual(
      fake.limiterKeys.map((k) => k.bucket),
      ['ip', 'signin']
    );
    for (const { keyHash } of fake.limiterKeys) {
      assert.match(keyHash, /^[0-9a-f]{64}$/);
      assert.ok(!keyHash.includes('8801711000999') && !keyHash.includes('198.51.100.1'));
    }
  });
});

describe('reset', () => {
  it('returns the same response for known and unknown phones', async () => {
    const known = await send(makeFake().deps, reset(KNOWN_PHONE));
    const unknown = await send(makeFake().deps, reset('+8801711000000'));

    assert.equal(known.status, 200);
    assert.equal(known.text, unknown.text);
    assert.equal(JSON.parse(known.text).message, RESET_MESSAGE);
  });

  it('sends the reset email only for a known phone, with the redirect', async () => {
    const fake = makeFake();
    await send(fake.deps, reset(KNOWN_PHONE, 'https://dashboard.example/reset-password'));
    await send(fake.deps, reset('+8801711000000'));

    assert.deepEqual(fake.resetCalls, [
      { email: KNOWN_EMAIL, redirectTo: 'https://dashboard.example/reset-password' },
    ]);
  });

  it('does not wait for a slow GoTrue reset beyond the floor', async () => {
    let finished = false;
    const fake = makeFake({
      minResponseMs: 100,
      sendPasswordReset: async () => {
        await delay(1500);
        finished = true;
      },
    });
    const res = await send(fake.deps, reset(KNOWN_PHONE));

    assert.equal(res.status, 200);
    assert.ok(res.elapsed >= 100 - TIMER_SLACK_MS && res.elapsed < 1000, `elapsed ${res.elapsed}`);
    assert.equal(finished, false);
  });

  it('logs a failed reset instead of failing the request', async (t) => {
    const errors: unknown[][] = [];
    t.mock.method(console, 'error', (...args: unknown[]) => errors.push(args));
    const fake = makeFake({
      sendPasswordReset: async () => {
        throw new Error('smtp down');
      },
    });
    const res = await send(fake.deps, reset(KNOWN_PHONE));
    await delay(10);

    assert.equal(res.status, 200);
    assert.equal(errors.length, 1);
    assert.ok(!JSON.stringify(errors).includes(KNOWN_EMAIL));
  });

  it('limits resets to 3 per phone per hour', async () => {
    const fake = makeFake();
    for (let i = 0; i < LIMITS.reset.max; i++) {
      assert.equal((await send(fake.deps, reset(KNOWN_PHONE))).status, 200);
    }
    const blocked = await send(fake.deps, reset(KNOWN_PHONE));
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
    assert.equal(fake.resetCalls.length, LIMITS.reset.max);
  });
});

describe('minimum response time', () => {
  it('holds for 200, 400 and 429', async () => {
    const fake = makeFake({ minResponseMs: 120, jitterMs: 30 });
    const ok = await send(fake.deps, signIn(KNOWN_PHONE, PASSWORD));
    const bad = await send(fake.deps, signIn('+8801711000000', PASSWORD));
    for (let i = 0; i < LIMITS.signin.max; i++) await send(fake.deps, signIn(KNOWN_PHONE, 'x'));
    const limited = await send(fake.deps, signIn(KNOWN_PHONE, 'x'));

    assert.deepEqual([ok.status, bad.status, limited.status], [200, 400, 429]);
    for (const res of [ok, bad, limited]) {
      assert.ok(res.elapsed >= 120 - TIMER_SLACK_MS, `elapsed ${res.elapsed}`);
    }
  });
});

describe('request validation', () => {
  it('rejects non-POST requests', async () => {
    const res = await send(makeFake().deps, new Request('http://localhost/', { method: 'GET' }));
    assert.equal(res.status, 405);
  });

  it('rejects malformed bodies and unknown actions', async () => {
    const { deps } = makeFake();
    const bad = [
      new Request('http://localhost/', { method: 'POST', body: 'not json' }),
      post({ action: 'phone-available', phone: KNOWN_PHONE }),
      post({ action: 'sign-in', phone: KNOWN_PHONE }),
      post({ action: 'sign-in', phone: '', password: PASSWORD }),
      post({ action: 'sign-in', phone: '1'.repeat(33), password: PASSWORD }),
      post({ action: 'reset', phone: KNOWN_PHONE, redirectTo: 42 }),
    ];
    for (const request of bad) assert.equal((await send(deps, request)).status, 400);
  });

  it('fails closed when the hash salt is missing', async (t) => {
    t.mock.method(console, 'error', () => {});
    const fake = makeFake({ hashSalt: undefined });
    const res = await send(fake.deps, signIn(KNOWN_PHONE, PASSWORD));

    assert.equal(res.status, 503);
    assert.deepEqual(fake.signInCalls, []);
  });

  it('returns 503 without details when the limiter fails', async (t) => {
    t.mock.method(console, 'error', () => {});
    const fake = makeFake({
      rateLimitHit: async () => {
        throw new Error('db down');
      },
    });
    const res = await send(fake.deps, signIn(KNOWN_PHONE, PASSWORD));

    assert.equal(res.status, 503);
    assert.equal(res.text, JSON.stringify({ error: 'unavailable' }));
  });
});

describe('client IP', () => {
  const headers = (values: Record<string, string>) => new Headers(values);

  it('uses x-sp-client-ip when the forward secret matches', async () => {
    const ip = await clientIp(
      headers({
        'x-sp-client-ip': '192.0.2.10',
        'x-sp-forward-secret': FORWARD_SECRET,
        'cf-connecting-ip': '198.51.100.1',
      }),
      FORWARD_SECRET
    );
    assert.equal(ip, '192.0.2.10');
  });

  it('ignores x-sp-client-ip with a wrong secret', async () => {
    const ip = await clientIp(
      headers({
        'x-sp-client-ip': '192.0.2.10',
        'x-sp-forward-secret': 'wrong-secret',
        'cf-connecting-ip': '198.51.100.1',
      }),
      FORWARD_SECRET
    );
    assert.equal(ip, '198.51.100.1');
  });

  it('ignores x-sp-client-ip without a secret header', async () => {
    const ip = await clientIp(
      headers({ 'x-sp-client-ip': '192.0.2.10', 'cf-connecting-ip': '198.51.100.1' }),
      FORWARD_SECRET
    );
    assert.equal(ip, '198.51.100.1');
  });

  it('never trusts x-sp-client-ip when the function has no secret configured', async () => {
    const ip = await clientIp(
      headers({
        'x-sp-client-ip': '192.0.2.10',
        'x-sp-forward-secret': '',
        'cf-connecting-ip': '198.51.100.1',
      }),
      undefined
    );
    assert.equal(ip, '198.51.100.1');
  });

  it('falls back to cf-connecting-ip when the secret matches but no IP is forwarded', async () => {
    const ip = await clientIp(
      headers({ 'x-sp-forward-secret': FORWARD_SECRET, 'cf-connecting-ip': '198.51.100.1' }),
      FORWARD_SECRET
    );
    assert.equal(ip, '198.51.100.1');
  });

  it('falls back to the first x-forwarded-for entry without cf-connecting-ip', async () => {
    const ip = await clientIp(
      headers({ 'x-forwarded-for': '198.51.100.7, 198.51.100.7, 13.248.117.232' }),
      FORWARD_SECRET
    );
    assert.equal(ip, '198.51.100.7');
  });

  it('never reads True-Client-IP, X-Real-IP or Forwarded', async () => {
    const ip = await clientIp(
      headers({
        'true-client-ip': '203.0.113.10',
        'x-real-ip': '203.0.113.8',
        forwarded: 'for=203.0.113.11',
      }),
      FORWARD_SECRET
    );
    assert.equal(ip, 'unknown');
  });

  it('keys the IP limit on the forwarded IP from the dashboard', async () => {
    const fake = makeFake();
    const dashboard = { 'x-sp-client-ip': '192.0.2.10', 'x-sp-forward-secret': FORWARD_SECRET };
    for (let i = 0; i < LIMITS.ip.max; i++) {
      await send(fake.deps, signIn(`+88017110${String(i).padStart(5, '0')}`, 'x', dashboard));
    }
    const sameUser = await send(fake.deps, signIn('+8801799999999', 'x', dashboard));
    const otherUser = await send(
      fake.deps,
      signIn('+8801799999998', 'x', { ...dashboard, 'x-sp-client-ip': '192.0.2.11' })
    );

    assert.equal(sameUser.status, 429);
    assert.equal(otherUser.status, 400);
  });
});

describe('normalizePhone', () => {
  it('converts Bangladesh mobile numbers to +8801XXXXXXXXX', () => {
    for (const input of [
      '01711000555',
      '8801711000555',
      '+8801711000555',
      '008801711000555',
      '+880 1711-000555',
      '(0171) 100 0555',
    ]) {
      assert.equal(normalizePhone(input), '+8801711000555', input);
    }
  });

  it('only strips formatting from other numbers', () => {
    assert.equal(normalizePhone('+1 (555) 123-4567'), '+15551234567');
    assert.equal(normalizePhone('0171100055'), '0171100055');
    assert.equal(normalizePhone('01211000555'), '01211000555');
  });
});

describe('secretsMatch', () => {
  it('matches equal secrets and rejects different ones of any length', async () => {
    assert.equal(await secretsMatch(FORWARD_SECRET, FORWARD_SECRET), true);
    assert.equal(await secretsMatch('dashboard-forward-secreT', FORWARD_SECRET), false);
    assert.equal(await secretsMatch('short', FORWARD_SECRET), false);
    assert.equal(await secretsMatch('', FORWARD_SECRET), false);
  });
});
