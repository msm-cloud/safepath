// Tests for the claim-guardian-request edge function's request handling.
// Supabase calls are replaced with in-memory fakes. Run with
// `pnpm test:claim-guardian-request`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createHandler,
  SIGNED_URL_TTL_SECS,
  type Deps,
  type RequestDetails,
  type RpcResult,
} from '../functions/claim-guardian-request/handler.ts';

const STUDENT_TOKEN = 'student-access-token';
const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const REQUEST_ID = '22222222-2222-4222-8222-222222222222';

const DETAILS: RequestDetails = {
  success: true,
  request_id: REQUEST_ID,
  code: 'K7Q92MXZ',
  expires_at: '2026-10-11T12:00:00+00:00',
  guardian_name: 'Ammu',
  avatar_path: 'guardian-id/avatar.jpg',
  phone_last2: '42',
};

type Calls = {
  claim: Array<[string, string]>;
  getClaimed: Array<[string, string]>;
  signAvatar: Array<[string, number]>;
};

function setup(overrides: Partial<Deps> = {}) {
  const calls: Calls = { claim: [], getClaimed: [], signAvatar: [] };
  const deps: Deps = {
    getUserId: async (token) => (token === STUDENT_TOKEN ? STUDENT_ID : null),
    claim: async (studentId, code) => {
      calls.claim.push([studentId, code]);
      return DETAILS;
    },
    getClaimed: async (studentId, requestId) => {
      calls.getClaimed.push([studentId, requestId]);
      return DETAILS;
    },
    signAvatar: async (path, secs) => {
      calls.signAvatar.push([path, secs]);
      return `https://storage.example/signed/${path}?ttl=${secs}`;
    },
    ...overrides,
  };
  return { handler: createHandler(deps), calls };
}

function post(body: unknown, token: string | null = STUDENT_TOKEN): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request('http://localhost/claim-guardian-request', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function send(handler: (req: Request) => Promise<Response>, req: Request) {
  const res = await handler(req);
  return { status: res.status, headers: res.headers, body: await res.json() };
}

describe('claim by code', () => {
  it('returns the review details with a signed avatar URL and no storage path', async () => {
    const { handler, calls } = setup();
    const res = await send(handler, post({ code: 'k7q9 2mxz' }));

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      request: {
        requestId: REQUEST_ID,
        code: 'K7Q92MXZ',
        expiresAt: DETAILS.expires_at,
        guardianName: 'Ammu',
        phoneLast2: '42',
        avatarUrl: `https://storage.example/signed/guardian-id/avatar.jpg?ttl=600`,
      },
    });
    assert.ok(!JSON.stringify(res.body).includes('avatar_path'));
    assert.deepEqual(calls.claim, [[STUDENT_ID, 'k7q9 2mxz']]);
  });

  it('signs the avatar for 10 minutes', async () => {
    const { handler, calls } = setup();
    await send(handler, post({ code: 'K7Q92MXZ' }));
    assert.equal(SIGNED_URL_TTL_SECS, 600);
    assert.deepEqual(calls.signAvatar, [['guardian-id/avatar.jpg', 600]]);
  });

  it('passes the id from the verified token, never one from the body', async () => {
    const { handler, calls } = setup();
    await send(handler, post({ code: 'K7Q92MXZ', studentId: 'someone-else' }));
    assert.deepEqual(calls.claim, [[STUDENT_ID, 'K7Q92MXZ']]);
  });

  it('returns a null avatar and no sign call when the guardian has no photo', async () => {
    const { handler, calls } = setup({
      claim: async () => ({ ...DETAILS, avatar_path: null, phone_last2: null }),
    });
    const res = await send(handler, post({ code: 'K7Q92MXZ' }));
    assert.equal(res.status, 200);
    assert.equal(res.body.request.avatarUrl, null);
    assert.equal(res.body.request.phoneLast2, null);
    assert.equal(calls.signAvatar.length, 0);
  });

  it('falls back to no photo when signing fails', async () => {
    const { handler } = setup({
      signAvatar: async () => {
        throw new Error('object not found');
      },
    });
    const res = await send(handler, post({ code: 'K7Q92MXZ' }));
    assert.equal(res.status, 200);
    assert.equal(res.body.request.avatarUrl, null);
  });

  it('returns the generic invalid_code error for any failed lookup', async () => {
    const { handler } = setup({
      claim: async () => ({ success: false, error: 'invalid_code' }),
    });
    const res = await send(handler, post({ code: 'ZZZZZZZZ' }));
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'invalid_code' });
  });

  it('returns 429 with Retry-After when lookups are rate limited', async () => {
    const { handler } = setup({
      claim: async () => ({ success: false, error: 'rate_limited', retry_after_secs: 412 }),
    });
    const res = await send(handler, post({ code: 'K7Q92MXZ' }));
    assert.equal(res.status, 429);
    assert.equal(res.headers.get('Retry-After'), '412');
    assert.deepEqual(res.body, { error: 'rate_limited' });
  });
});

describe('re-open by request id', () => {
  it('returns the same details with a fresh signed URL', async () => {
    const { handler, calls } = setup();
    const res = await send(handler, post({ requestId: REQUEST_ID }));
    assert.equal(res.status, 200);
    assert.equal(res.body.request.requestId, REQUEST_ID);
    assert.equal(calls.getClaimed.length, 1);
    assert.deepEqual(calls.getClaimed[0], [STUDENT_ID, REQUEST_ID]);
    assert.equal(calls.claim.length, 0);
    assert.equal(calls.signAvatar.length, 1);
  });

  it('returns the generic not_found error when the request is not open for this student', async () => {
    const { handler } = setup({
      getClaimed: async (): Promise<RpcResult> => ({ success: false, error: 'not_found' }),
    });
    const res = await send(handler, post({ requestId: REQUEST_ID }));
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'not_found' });
  });
});

describe('authentication', () => {
  it('rejects a request with no bearer token', async () => {
    const { handler, calls } = setup();
    const res = await send(handler, post({ code: 'K7Q92MXZ' }, null));
    assert.equal(res.status, 401);
    assert.equal(calls.claim.length, 0);
  });

  it('rejects a token that is not a signed-in user (e.g. the anon key)', async () => {
    const { handler, calls } = setup();
    const res = await send(handler, post({ code: 'K7Q92MXZ' }, 'anon-key-jwt'));
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'not_authenticated' });
    assert.equal(calls.claim.length, 0);
  });
});

describe('request validation', () => {
  const invalidBodies: Array<[string, unknown]> = [
    ['not JSON', '{'],
    ['an empty object', {}],
    ['an empty code', { code: '   ' }],
    ['an overlong code', { code: 'A'.repeat(33) }],
    ['a non-string code', { code: 12345678 }],
    ['a requestId that is not a UUID', { requestId: 'abc' }],
    ['both code and requestId', { code: 'K7Q92MXZ', requestId: REQUEST_ID }],
  ];
  for (const [label, body] of invalidBodies) {
    it(`rejects ${label}`, async () => {
      const { handler, calls } = setup();
      const res = await send(handler, post(body));
      assert.equal(res.status, 400);
      assert.equal(calls.claim.length + calls.getClaimed.length, 0);
    });
  }

  it('rejects methods other than POST', async () => {
    const { handler } = setup();
    const res = await handler(new Request('http://localhost/claim-guardian-request'));
    assert.equal(res.status, 405);
  });
});

describe('failures', () => {
  it('returns 503 when the database call fails', async () => {
    const { handler } = setup({
      claim: async () => {
        throw new Error('connection reset');
      },
    });
    const original = console.error;
    console.error = () => {};
    try {
      const res = await send(handler, post({ code: 'K7Q92MXZ' }));
      assert.equal(res.status, 503);
      assert.deepEqual(res.body, { error: 'unavailable' });
    } finally {
      console.error = original;
    }
  });
});
