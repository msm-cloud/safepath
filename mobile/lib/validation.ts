// Deliberately simple — good enough to catch obvious typos before hitting
// the network. Supabase itself is the real source of truth on what counts
// as a valid, deliverable email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export const MIN_PASSWORD_LENGTH = 6;

// Deliberately simple — allows common formats (spaces, dashes, parens, a
// leading +) and just checks there are enough digits left to plausibly be
// a phone number (7-15, the E.164 bounds). Not validating against any one
// country's specific format, since emergency contacts could be anyone.
const PHONE_ALLOWED_CHARS_RE = /^[+()\-\s\d]+$/;
const PHONE_DIGITS_MIN = 7;
const PHONE_DIGITS_MAX = 15;

export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!PHONE_ALLOWED_CHARS_RE.test(trimmed)) return false;
  const digitCount = trimmed.replace(/\D/g, '').length;
  return digitCount >= PHONE_DIGITS_MIN && digitCount <= PHONE_DIGITS_MAX;
}
