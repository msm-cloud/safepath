// auth-identifier — Edge Function
//
// Phone-number sign-in and password reset without exposing the account's
// email to the caller. Email sign-in stays a direct signInWithPassword call
// from the clients.
//
//   POST { action: 'sign-in', phone, password }
//     200 { session }                      token fields only, never the email
//     400 { error: 'invalid_credentials' } unknown phone or wrong password
//     403 { error: 'email_not_confirmed' } correct password, unconfirmed email
//   POST { action: 'reset', phone, redirectTo? }
//     200 { message }                      always, whether or not the phone exists
//   Either action:
//     429 { error: 'rate_limited' } + Retry-After
//
// Rate limits and the phone -> email lookup live in
// supabase/migrations/20260929204605_auth_rate_limit.sql; the logic is in
// handler.ts.
//
// Deployed with JWT verification on. That works because the mobile app and
// the dashboard call it with the legacy anon key, which is a JWT. If the
// project moves to sb_publishable_ keys, those aren't JWTs: this function
// will need verify_jwt disabled plus its own apikey check.
//
// Env vars used:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY — provided
//     by the Edge Function runtime.
//   AUTH_RATE_LIMIT_SALT — project secret; HMAC key for stored phone/IP
//     hashes. Requests fail with 503 until it's set.
//   DASHBOARD_FORWARD_SECRET — project secret shared with the dashboard
//     server, which sends the end user's IP in x-sp-client-ip. Optional;
//     without it that header is never trusted.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

import { createHandler, type Bucket, type Session, type SignInResult } from './handler.ts';

const MIN_RESPONSE_MS = 800;
const RESPONSE_JITTER_MS = 200;
const DEFAULT_GOTRUE_RETRY_AFTER_SECS = 60;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function lookupEmail(normalizedPhone: string): Promise<string | null> {
  const { data, error } = await admin.rpc('auth_identifier_email_for_phone', {
    p_phone: normalizedPhone,
  });
  if (error) throw new Error(`email lookup failed: ${error.code ?? error.message}`);
  return typeof data === 'string' ? data : null;
}

async function rateLimitHit(
  bucket: Bucket,
  keyHash: string,
  windowSecs: number,
  max: number
): Promise<number> {
  const { data, error } = await admin.rpc('auth_rate_limit_hit', {
    p_bucket: bucket,
    p_key_hash: keyHash,
    p_window_secs: windowSecs,
    p_max: max,
  });
  if (error) throw new Error(`rate limit check failed: ${error.code ?? error.message}`);
  return Number(data);
}

async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));

  if (res.ok) return { kind: 'ok', session: body as Session };
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After'));
    return {
      kind: 'rate_limited',
      retryAfterSecs: retryAfter > 0 ? retryAfter : DEFAULT_GOTRUE_RETRY_AFTER_SECS,
    };
  }

  const code = (body as { error_code?: string }).error_code;
  if (code === 'invalid_credentials') return { kind: 'invalid_credentials' };
  if (code === 'email_not_confirmed') return { kind: 'email_not_confirmed' };
  console.error('auth-identifier: unexpected sign-in response', res.status, code);
  return { kind: 'error' };
}

async function sendPasswordReset(email: string, redirectTo: string | undefined): Promise<void> {
  // GoTrue checks redirect_to against the project's allowed redirect URLs.
  const query = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : '';
  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover${query}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`password reset request failed with status ${res.status}`);
}

Deno.serve(
  createHandler({
    lookupEmail,
    signInWithPassword,
    sendPasswordReset,
    rateLimitHit,
    hashSalt: Deno.env.get('AUTH_RATE_LIMIT_SALT'),
    forwardSecret: Deno.env.get('DASHBOARD_FORWARD_SECRET'),
    minResponseMs: MIN_RESPONSE_MS,
    jitterMs: RESPONSE_JITTER_MS,
    now: () => performance.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    random: Math.random,
  })
);
