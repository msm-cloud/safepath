// Request handling for auth-identifier, kept free of Deno-only APIs so it
// can be tested under Node. index.ts wires in the real Supabase calls.

export const LIMITS = {
  ip: { windowSecs: 15 * 60, max: 30 },
  signin: { windowSecs: 15 * 60, max: 5 },
  reset: { windowSecs: 60 * 60, max: 3 },
} as const;

export type Bucket = keyof typeof LIMITS;

// Used when a phone has no account, so GoTrue still does the same work.
export const DUMMY_EMAIL = 'no-account@auth-identifier.invalid';

export const RESET_MESSAGE =
  "If an account exists for that phone number, we've sent a password reset email.";
export const RATE_LIMITED_MESSAGE = 'Too many attempts, try later';

const MAX_PHONE_LENGTH = 32;
const MAX_PASSWORD_LENGTH = 256;
const MAX_REDIRECT_LENGTH = 2048;
const MAX_FORWARDED_IP_LENGTH = 64;

export type Session = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
};

export type SignInResult =
  | { kind: 'ok'; session: Session }
  | { kind: 'invalid_credentials' }
  | { kind: 'email_not_confirmed' }
  | { kind: 'rate_limited'; retryAfterSecs: number }
  | { kind: 'error' };

export type Deps = {
  lookupEmail: (normalizedPhone: string) => Promise<string | null>;
  signInWithPassword: (email: string, password: string) => Promise<SignInResult>;
  sendPasswordReset: (email: string, redirectTo: string | undefined) => Promise<void>;
  // Returns 0 when the attempt is allowed and recorded, otherwise seconds to wait.
  rateLimitHit: (
    bucket: Bucket,
    keyHash: string,
    windowSecs: number,
    max: number
  ) => Promise<number>;
  hashSalt: string | undefined;
  forwardSecret: string | undefined;
  minResponseMs: number;
  jitterMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
};

type SignInBody = { action: 'sign-in'; phone: string; password: string };
type ResetBody = { action: 'reset'; phone: string; redirectTo: string | undefined };

export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  return async (req) => {
    const startedAt = deps.now();
    const response = await route(req, deps);
    // Every outcome takes at least this long, so response time doesn't
    // reveal whether the phone has an account.
    const target = deps.minResponseMs + deps.random() * deps.jitterMs;
    const remaining = target - (deps.now() - startedAt);
    if (remaining > 0) await deps.sleep(remaining);
    return response;
  };
}

async function route(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const body = parseBody(await req.text());
  if (!body) return json(400, { error: 'invalid_request' });

  if (!deps.hashSalt) {
    console.error('auth-identifier: AUTH_RATE_LIMIT_SALT is not set');
    return json(503, { error: 'unavailable' });
  }

  try {
    const ip = await clientIp(req.headers, deps.forwardSecret);
    const ipWait = await hit(deps, 'ip', await hmacHex(deps.hashSalt, `ip:${ip}`));
    if (ipWait > 0) return rateLimited(ipWait);

    const phone = normalizePhone(body.phone);
    const phoneKey = await hmacHex(deps.hashSalt, `phone:${phone}`);

    return body.action === 'sign-in'
      ? await signIn(deps, phone, phoneKey, body.password)
      : await reset(deps, phone, phoneKey, body.redirectTo);
  } catch (err) {
    console.error('auth-identifier: request failed', errorMessage(err));
    return json(503, { error: 'unavailable' });
  }
}

async function signIn(
  deps: Deps,
  phone: string,
  phoneKey: string,
  password: string
): Promise<Response> {
  // Recorded before the password is checked, successes included, so
  // parallel guesses can't all pass the check before any is counted.
  const wait = await hit(deps, 'signin', phoneKey);
  if (wait > 0) return rateLimited(wait);

  const email = await deps.lookupEmail(phone);
  const result = await deps.signInWithPassword(email ?? DUMMY_EMAIL, password);

  if (!email) {
    if (result.kind === 'rate_limited') return rateLimited(result.retryAfterSecs);
    if (result.kind === 'error') return json(503, { error: 'unavailable' });
    return json(400, { error: 'invalid_credentials' });
  }

  switch (result.kind) {
    case 'ok':
      return json(200, { session: pickSession(result.session) });
    case 'invalid_credentials':
      return json(400, { error: 'invalid_credentials' });
    case 'email_not_confirmed':
      // Only reachable with the correct password.
      return json(403, { error: 'email_not_confirmed' });
    case 'rate_limited':
      return rateLimited(result.retryAfterSecs);
    case 'error':
      return json(503, { error: 'unavailable' });
  }
}

async function reset(
  deps: Deps,
  phone: string,
  phoneKey: string,
  redirectTo: string | undefined
): Promise<Response> {
  const wait = await hit(deps, 'reset', phoneKey);
  if (wait > 0) return rateLimited(wait);

  const email = await deps.lookupEmail(phone);
  // Not awaited: sending the email must not make the known-phone case slower.
  if (email) runInBackground(deps.sendPasswordReset(email, redirectTo));

  return json(200, { message: RESET_MESSAGE });
}

function hit(deps: Deps, bucket: Bucket, keyHash: string): Promise<number> {
  const { windowSecs, max } = LIMITS[bucket];
  return deps.rateLimitHit(bucket, keyHash, windowSecs, max);
}

function parseBody(raw: string): SignInBody | ResetBody | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { action, phone, password, redirectTo } = value as Record<string, unknown>;

  if (!isBoundedString(phone, MAX_PHONE_LENGTH)) return null;

  if (action === 'sign-in') {
    if (!isBoundedString(password, MAX_PASSWORD_LENGTH)) return null;
    return { action, phone, password };
  }
  if (action === 'reset') {
    if (redirectTo !== undefined && !isBoundedString(redirectTo, MAX_REDIRECT_LENGTH)) return null;
    return { action, phone, redirectTo };
  }
  return null;
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

// Same rule as public.normalize_phone(), so lookups and rate-limit keys
// agree with the unique index on profiles.phone.
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}

// x-sp-client-ip is only trusted from the dashboard server, which proves
// itself with the shared secret. Otherwise cf-connecting-ip, which
// Cloudflare sets and refuses to accept from clients; then the first
// x-forwarded-for entry, which the Supabase edge rewrites. True-Client-IP,
// X-Real-IP and Forwarded are never read: the first passes through
// unchanged from the caller and the other two are stripped upstream.
export async function clientIp(
  headers: Headers,
  forwardSecret: string | undefined
): Promise<string> {
  const forwardedIp = headers.get('x-sp-client-ip')?.trim();
  const presentedSecret = headers.get('x-sp-forward-secret');
  if (
    forwardedIp &&
    forwardedIp.length <= MAX_FORWARDED_IP_LENGTH &&
    presentedSecret &&
    forwardSecret &&
    (await secretsMatch(presentedSecret, forwardSecret))
  ) {
    return forwardedIp;
  }

  const cfIp = headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  const firstForwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (firstForwarded) return firstForwarded;

  return 'unknown';
}

// Constant-time: both values are HMACed under a throwaway key first, so the
// comparison always runs over two 32-byte digests regardless of input length.
export async function secretsMatch(presented: string, expected: string): Promise<boolean> {
  const key = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(presented)),
    crypto.subtle.sign('HMAC', key, encoder.encode(expected)),
  ]);
  const bytesA = new Uint8Array(a);
  const bytesB = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) diff |= bytesA[i] ^ bytesB[i];
  return diff === 0;
}

export async function hmacHex(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

type EdgeRuntimeGlobal = { waitUntil: (task: Promise<unknown>) => void };

// EdgeRuntime.waitUntil keeps the worker alive until the task settles. Where
// it doesn't exist (tests), the task simply runs unawaited.
export function runInBackground(task: Promise<unknown>): void {
  const guarded = task.catch((err: unknown) => {
    console.error('auth-identifier: background task failed', errorMessage(err));
  });
  const runtime = (globalThis as { EdgeRuntime?: EdgeRuntimeGlobal }).EdgeRuntime;
  runtime?.waitUntil(guarded);
}

// The GoTrue response also carries the user object (with the email); only
// the token fields go back to the caller.
function pickSession(session: Session): Session {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
  };
}

function rateLimited(retryAfterSecs: number): Response {
  return json(
    429,
    { error: 'rate_limited', message: RATE_LIMITED_MESSAGE },
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
