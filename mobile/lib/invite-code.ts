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

// Codes are shown in two groups and often read out or retyped, so spaces,
// dashes and case don't matter. The server normalizes the same way.
export function normalizeInviteCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

// Milliseconds until the earliest of `times` (ISO strings) still ahead, or
// null when none is. Used to refresh a list when its first item lapses.
// Times already past are skipped: if the phone's clock runs ahead of the
// server, re-fetching straight away would keep returning the same item.
// setTimeout misbehaves above 2^31 - 1 ms, so the delay is capped there.
export function msUntilEarliest(times: string[], now: number = Date.now()): number | null {
  const ahead = times.map((time) => new Date(time).getTime() - now).filter((ms) => ms > 0);
  if (ahead.length === 0) return null;
  return Math.min(Math.min(...ahead), 2 ** 31 - 1);
}
