// Invite code helpers with no Supabase dependency, so `pnpm test:mobile` can
// load them directly.

// Matches the 24-hour window in redeem_guardian_invite
// (supabase/migrations/20261003120000_invite_code_expiry.sql). The server
// enforces it; the app only uses it to label codes and hide expired ones
// before the expiry job revokes them.
export const INVITE_CODE_TTL_MS = 24 * 60 * 60 * 1000;

// Codes are 8 characters; two groups of four are easier to read aloud and
// to type. The stored code has no space.
export function formatInviteCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

export function inviteCodeExpiresAt(createdAt: string): Date {
  return new Date(new Date(createdAt).getTime() + INVITE_CODE_TTL_MS);
}

// Same boundary as the server: redeemable while created_at > now() - 24h.
export function isInviteCodeExpired(createdAt: string, now: number = Date.now()): boolean {
  return inviteCodeExpiresAt(createdAt).getTime() <= now;
}
