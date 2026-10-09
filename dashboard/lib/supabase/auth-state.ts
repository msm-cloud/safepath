import type { User } from '@supabase/supabase-js';
import { cache } from 'react';

import { checkAuth, isTransientAuthError, withDeadline, type AuthCheck } from '@/lib/auth-check';

import { createClient } from './server';

export type SessionUser = Pick<User, 'id' | 'email'>;

export type AuthState =
  | Exclude<AuthCheck, { status: 'unavailable' }>
  // The user comes from the session cookie and is unverified. It is only
  // used for display and to pick rows to read; RLS still checks the token
  // on every query.
  | { status: 'unavailable'; user: SessionUser | null };

const SESSION_READ_TIMEOUT_MS = 2000;

function tokenUser(accessToken: string): SessionUser | null {
  try {
    const claims = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString());
    if (typeof claims.sub !== 'string') return null;
    return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : undefined };
  } catch {
    return null;
  }
}

// Reads the session from the cookie without asking the auth server, unless
// the access token has expired and needs a refresh.
async function cookieUser(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<SessionUser | null> {
  try {
    const { data } = await withDeadline(supabase.auth.getSession(), SESSION_READ_TIMEOUT_MS);
    return data.session ? tokenUser(data.session.access_token) : null;
  } catch (error) {
    if (isTransientAuthError(error)) return null;
    throw error;
  }
}

// Cached per request, so the root layout, the dashboard layout and the page
// share one check instead of each waiting on the auth server.
export const getAuthState = cache(async (): Promise<AuthState> => {
  const supabase = await createClient();
  const result = await checkAuth(() => supabase.auth.getUser());
  if (result.status !== 'unavailable') return result;
  return { status: 'unavailable', user: await cookieUser(supabase) };
});

const DEGRADED_REQUEST_TIMEOUT_MS = 3000;

// Client for a page's data queries. Once the auth check has failed the
// network is known to be bad, so each query gets one short try instead of
// retries that would hold the page (and the connection notice) for ~7 s
// per query.
export async function createPageClient() {
  const auth = await getAuthState();
  return auth.status === 'unavailable'
    ? createClient({ requestTimeoutMs: DEGRADED_REQUEST_TIMEOUT_MS, retry: false })
    : createClient();
}
