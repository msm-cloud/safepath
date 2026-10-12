import { functionRegion } from '@/lib/function-region';
import { supabase } from '@/lib/supabase';

// Client for the auth-identifier edge function
// (supabase/functions/auth-identifier), which handles phone-number sign-in
// and password reset without ever returning the account's email. Email
// sign-in and reset stay direct Supabase Auth calls.

export type PhoneSignInResult =
  | { kind: 'ok' }
  | { kind: 'invalid_credentials' }
  | { kind: 'email_not_confirmed' }
  | { kind: 'rate_limited' }
  | { kind: 'error' };

export type PhoneResetResult = { kind: 'sent' } | { kind: 'rate_limited' } | { kind: 'error' };

type SessionTokens = { access_token?: string; refresh_token?: string };

export async function phoneSignIn(phone: string, password: string): Promise<PhoneSignInResult> {
  const { data, status } = await callAuthIdentifier({ action: 'sign-in', phone, password });

  if (status === 200) {
    const session = (data as { session?: SessionTokens } | null)?.session;
    if (!session?.access_token || !session.refresh_token) return { kind: 'error' };
    // Stores the session, which AuthProvider picks up like any other sign-in.
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    return error ? { kind: 'error' } : { kind: 'ok' };
  }
  if (status === 400) return { kind: 'invalid_credentials' };
  if (status === 403) return { kind: 'email_not_confirmed' };
  if (status === 429) return { kind: 'rate_limited' };
  return { kind: 'error' };
}

export async function phoneReset(phone: string, redirectTo: string): Promise<PhoneResetResult> {
  const { status } = await callAuthIdentifier({ action: 'reset', phone, redirectTo });
  if (status === 200) return { kind: 'sent' };
  if (status === 429) return { kind: 'rate_limited' };
  return { kind: 'error' };
}

// status is null when the request never got a response (offline, DNS, etc.).
async function callAuthIdentifier(
  body: Record<string, string>
): Promise<{ data: unknown; status: number | null }> {
  try {
    const { data, response } = await supabase.functions.invoke('auth-identifier', {
      body,
      region: functionRegion(),
    });
    return { data, status: response?.status ?? null };
  } catch {
    return { data: null, status: null };
  }
}
