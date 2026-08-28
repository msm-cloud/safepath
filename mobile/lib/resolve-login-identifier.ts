import { supabase } from '@/lib/supabase';

// Thin wrapper around the resolve_login_identifier() RPC (see
// supabase/migrations/20260828063528_phone_login_and_password_reset.sql)
// shared by sign-in.tsx and forgot-password.tsx — both need to turn
// whatever was typed into an "Email or Phone Number" field into a real
// email before calling signInWithPassword/resetPasswordForEmail.
//
// Returns null both when the RPC call itself fails (network error, etc.)
// and when the identifier genuinely doesn't resolve to any account —
// deliberately not distinguished, since the whole point of this function
// is that callers must not be able to tell those apart (that would leak
// whether a given email/phone has an account).
export async function resolveLoginIdentifier(identifier: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('resolve_login_identifier', {
    identifier: identifier.trim(),
  });
  if (error) return null;
  return data;
}
