import { AuthUnknownError, isAuthRetryableFetchError, type User } from '@supabase/supabase-js';

// What the server knows about the visitor after asking the auth server.
// `unavailable` means the question couldn't be answered (slow or failed
// network), which is not the same as being signed out: the guardian keeps
// the page and is only sent to /login once the auth server says so.
export type AuthCheck =
  { status: 'signed-in'; user: User } | { status: 'signed-out' } | { status: 'unavailable' };

type GetUserResult = { data: { user: User | null }; error: Error | null };

export type AuthCheckOptions = {
  attempts: number;
  attemptTimeoutMs: number;
  retryDelayMs: number;
};

export const DEFAULT_AUTH_CHECK: AuthCheckOptions = {
  attempts: 2,
  attemptTimeoutMs: 2500,
  retryDelayMs: 500,
};

class AuthCheckTimeout extends Error {}

// Network failures, 5xx responses and unparseable replies (e.g. a proxy's
// HTML error page) say nothing about the session. Any other auth error —
// no session, a bad or expired token, a revoked session — is a real answer.
export function isTransientAuthError(error: unknown): boolean {
  return (
    error instanceof AuthCheckTimeout ||
    isAuthRetryableFetchError(error) ||
    error instanceof AuthUnknownError
  );
}

export function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AuthCheckTimeout(`timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

// The deadline matters even with a fetch timeout: an expired access token
// makes getUser() refresh it first, and auth-js retries a failed refresh
// for up to 30 s on its own.
export async function checkAuth(
  getUser: () => Promise<GetUserResult>,
  options: AuthCheckOptions = DEFAULT_AUTH_CHECK
): Promise<AuthCheck> {
  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    try {
      const { data, error } = await withDeadline(getUser(), options.attemptTimeoutMs);
      if (data.user) return { status: 'signed-in', user: data.user };
      if (!isTransientAuthError(error)) return { status: 'signed-out' };
    } catch (error) {
      if (!isTransientAuthError(error)) throw error;
    }
    if (attempt < options.attempts) {
      await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs * attempt));
    }
  }
  return { status: 'unavailable' };
}
