import { headers } from 'next/headers';

// Server-side client for the auth-identifier edge function
// (supabase/functions/auth-identifier), which handles phone-number sign-in
// and password reset without ever returning the account's email. Only
// import this from server code: it reads DASHBOARD_FORWARD_SECRET.

export type PhoneSignInResult =
  | { kind: 'ok'; session: { access_token: string; refresh_token: string } }
  | { kind: 'invalid_credentials' }
  | { kind: 'email_not_confirmed' }
  | { kind: 'rate_limited' }
  | { kind: 'error' };

export type PhoneResetResult = { kind: 'sent' } | { kind: 'rate_limited' } | { kind: 'error' };

export async function phoneSignIn(phone: string, password: string): Promise<PhoneSignInResult> {
  const res = await callAuthIdentifier({ action: 'sign-in', phone, password });
  if (!res) return { kind: 'error' };

  if (res.status === 200) {
    const body = (await res.json()) as {
      session?: { access_token?: string; refresh_token?: string };
    };
    const accessToken = body.session?.access_token;
    const refreshToken = body.session?.refresh_token;
    if (!accessToken || !refreshToken) return { kind: 'error' };
    return { kind: 'ok', session: { access_token: accessToken, refresh_token: refreshToken } };
  }
  if (res.status === 400) return { kind: 'invalid_credentials' };
  if (res.status === 403) return { kind: 'email_not_confirmed' };
  if (res.status === 429) return { kind: 'rate_limited' };
  return { kind: 'error' };
}

export async function phoneReset(phone: string, redirectTo: string): Promise<PhoneResetResult> {
  const res = await callAuthIdentifier({ action: 'reset', phone, redirectTo });
  if (!res) return { kind: 'error' };
  if (res.status === 200) return { kind: 'sent' };
  if (res.status === 429) return { kind: 'rate_limited' };
  return { kind: 'error' };
}

async function callAuthIdentifier(body: Record<string, string>): Promise<Response | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
    ...(await forwardingHeaders()),
  };

  try {
    return await fetch(`${supabaseUrl}/functions/v1/auth-identifier`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return null;
  }
}

// Every call reaches the function from this server's IP, so the end user's
// IP is passed along for per-IP rate limiting. The function trusts it only
// alongside the shared secret. The first x-forwarded-for entry is the
// client as seen by the hosting platform's edge, which must overwrite any
// value the client sent (Vercel does).
async function forwardingHeaders(): Promise<Record<string, string>> {
  const secret = process.env.DASHBOARD_FORWARD_SECRET;
  if (!secret) return {};

  const clientIp = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!clientIp) return {};

  return { 'x-sp-forward-secret': secret, 'x-sp-client-ip': clientIp };
}
