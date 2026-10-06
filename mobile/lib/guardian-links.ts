import { supabase } from '@/lib/supabase';

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
