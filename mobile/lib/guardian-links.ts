import { supabase } from '@/lib/supabase';

// Codes are 8 characters; two groups of four are easier to read aloud and
// to type. The stored code has no space.
export function formatInviteCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

// Matches the 24-hour window in redeem_guardian_invite
// (supabase/migrations/20261003120000_invite_code_expiry.sql). The server
// enforces it; the app only uses it to label codes and hide expired ones
// before the expiry job revokes them.
const INVITE_CODE_TTL_MS = 24 * 60 * 60 * 1000;

export function inviteCodeExpiresAt(createdAt: string): Date {
  return new Date(new Date(createdAt).getTime() + INVITE_CODE_TTL_MS);
}

type RevokeResult =
  { success: true } | { success: false; error: 'not_found' | 'not_authenticated' };

// Ends a guardian link or cancels an unused code (revoke_guardian_link in
// supabase/migrations/20261001180000_revoke_guardian_link.sql). not_found
// means the link is already gone, which is the outcome the caller wanted.
export async function revokeGuardianLink(linkId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('revoke_guardian_link', { p_link_id: linkId });
  if (error) return false;
  const result = data as unknown as RevokeResult;
  return result.success || result.error === 'not_found';
}
