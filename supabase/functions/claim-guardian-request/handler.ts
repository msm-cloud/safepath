// Request handling for claim-guardian-request, kept free of Deno-only APIs
// so it can be tested under Node. index.ts wires in the real Supabase calls.

export const SIGNED_URL_TTL_SECS = 600;

const MAX_CODE_LENGTH = 32;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The jsonb returned by claim_guardian_request and
// get_claimed_guardian_request
// (supabase/migrations/20261010120000_guardian_requests.sql).
export type RequestDetails = {
  success: true;
  request_id: string;
  code: string;
  expires_at: string;
  guardian_name: string | null;
  avatar_path: string | null;
  phone_last2: string | null;
};

export type RpcResult =
  | RequestDetails
  | { success: false; error: 'invalid_code' | 'not_found' | 'not_authenticated' }
  | { success: false; error: 'rate_limited'; retry_after_secs: number };

export type Deps = {
  // The user id behind an access token, or null when it isn't a signed-in user.
  getUserId: (accessToken: string) => Promise<string | null>;
  claim: (studentId: string, code: string) => Promise<RpcResult>;
  getClaimed: (studentId: string, requestId: string) => Promise<RpcResult>;
  // A signed URL for a path in the avatars bucket.
  signAvatar: (path: string, expiresInSecs: number) => Promise<string>;
};

type Body = { code: string } | { requestId: string };

export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

    const token = bearerToken(req.headers);
    if (!token) return json(401, { error: 'not_authenticated' });

    const body = parseBody(await req.text());
    if (!body) return json(400, { error: 'invalid_request' });

    try {
      const studentId = await deps.getUserId(token);
      if (!studentId) return json(401, { error: 'not_authenticated' });

      const result =
        'code' in body
          ? await deps.claim(studentId, body.code)
          : await deps.getClaimed(studentId, body.requestId);

      if (!result.success) {
        if (result.error === 'rate_limited') return rateLimited(result.retry_after_secs);
        if (result.error === 'not_authenticated') return json(401, { error: 'not_authenticated' });
        return json(404, { error: result.error });
      }

      return json(200, {
        request: {
          requestId: result.request_id,
          code: result.code,
          expiresAt: result.expires_at,
          guardianName: result.guardian_name,
          phoneLast2: result.phone_last2,
          avatarUrl: await signedAvatarUrl(deps, result.avatar_path),
        },
      });
    } catch (err) {
      console.error('claim-guardian-request: request failed', errorMessage(err));
      return json(503, { error: 'unavailable' });
    }
  };
}

// The storage path never leaves this function. A failed signing falls back
// to no photo, so the app shows the placeholder avatar instead of failing.
async function signedAvatarUrl(deps: Deps, path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    return await deps.signAvatar(path, SIGNED_URL_TTL_SECS);
  } catch (err) {
    console.error('claim-guardian-request: avatar signing failed', errorMessage(err));
    return null;
  }
}

function bearerToken(headers: Headers): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(headers.get('Authorization') ?? '');
  return match ? match[1] : null;
}

function parseBody(raw: string): Body | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { code, requestId } = value as Record<string, unknown>;

  if (code !== undefined && requestId !== undefined) return null;
  if (typeof code === 'string' && code.trim().length > 0 && code.length <= MAX_CODE_LENGTH) {
    return { code };
  }
  if (typeof requestId === 'string' && UUID_RE.test(requestId)) return { requestId };
  return null;
}

function rateLimited(retryAfterSecs: number): Response {
  return json(
    429,
    { error: 'rate_limited' },
    { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterSecs))) }
  );
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
