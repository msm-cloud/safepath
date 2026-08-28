// Extracts Supabase password-recovery tokens from a deep link URL.
//
// This project's Supabase client uses the default 'implicit' auth flow
// (see lib/supabase.ts — flowType isn't overridden), so
// resetPasswordForEmail's redirect link carries its tokens as a URL
// FRAGMENT: safepath://reset-password#access_token=...&refresh_token=
// ...&type=recovery — mirroring exactly what supabase-js's own (browser-
// only) parseParametersFromURL helper looks for. expo-linking's Linking.
// parse() only reads the query string, not the fragment, so it can't be
// used for this — hence a small dedicated parser instead.
export type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
};

export function extractRecoveryTokens(url: string): RecoveryTokens | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;

  const params = new URLSearchParams(url.slice(hashIndex + 1));
  if (params.get('type') !== 'recovery') return null;

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken };
}
