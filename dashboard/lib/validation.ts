// Mirrors mobile/lib/validation.ts's isValidPhone exactly (same allowed
// characters, same digit-count bounds) — kept as a small separate copy
// rather than a shared package for the same reason lib/translations.ts
// already is (see its own comment): a handful of duplicated lines is
// cheaper than the cross-package coordination a shared package would add.
//
// Deliberately simple — allows common formats (spaces, dashes, parens, a
// leading +) and just checks there are enough digits left to plausibly be
// a phone number (7-15, the E.164 bounds). Not validating against any one
// country's specific format.
const PHONE_ALLOWED_CHARS_RE = /^[+()\-\s\d]+$/;
const PHONE_DIGITS_MIN = 7;
const PHONE_DIGITS_MAX = 15;

export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!PHONE_ALLOWED_CHARS_RE.test(trimmed)) return false;
  const digitCount = trimmed.replace(/\D/g, '').length;
  return digitCount >= PHONE_DIGITS_MIN && digitCount <= PHONE_DIGITS_MAX;
}
