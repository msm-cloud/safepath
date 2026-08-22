// Deliberately simple — good enough to catch obvious typos before hitting
// the network. Supabase itself is the real source of truth on what counts
// as a valid, deliverable email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export const MIN_PASSWORD_LENGTH = 6;
