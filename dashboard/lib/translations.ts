// Lightweight custom translation system — not a full i18n library. A flat
// dictionary of { en, bn } pairs plus a pure lookup function. Used both by
// the LanguageContext (see language-context.tsx, for Client Components)
// and directly by Server Components, which can't use React Context at all
// — see past-alerts.tsx and dashboard/layout.tsx.
//
// Kept as a separate dictionary from mobile/lib/translations.ts rather
// than a shared package: real overlap exists (email/password validation
// strings, "Sign In"/"Sign Up"/"Sign Out"), but it's a small fraction of
// each app's actual strings, and the two apps' screens are different
// enough that a shared package would add more cross-package coordination
// overhead than the ~10-15 duplicated key-value pairs it would save.
//
// TRANSLATION QUALITY: the Bangla strings here are a best-effort pass, not
// a reviewed final translation. Someone who speaks Bangla natively should
// review the wording before this ships — especially the SOS/alert/
// emergency strings, which need to be completely unambiguous. Don't treat
// these as production-ready just because the code compiles.

export type Language = 'bn' | 'en';

type Entry = { en: string; bn: string };

export const translations = {
  // --- Sign in ---
  signInTitle: { en: 'Sign in to SafePath', bn: 'সেফপাথে সাইন ইন করুন' },
  emailPlaceholder: { en: 'Email', bn: 'ইমেইল' },
  passwordPlaceholder: { en: 'Password', bn: 'পাসওয়ার্ড' },
  signInButton: { en: 'Sign In', bn: 'সাইন ইন' },
  signingInButton: { en: 'Signing in…', bn: 'সাইন ইন হচ্ছে…' },
  showPasswordLabel: { en: 'Show password', bn: 'পাসওয়ার্ড দেখান' },
  hidePasswordLabel: { en: 'Hide password', bn: 'পাসওয়ার্ড লুকান' },
  noAccountQuestion: { en: "Don't have an account?", bn: 'অ্যাকাউন্ট নেই?' },
  signUpNow: { en: 'Sign up', bn: 'সাইন আপ করুন' },

  // --- Sign up ---
  signUpTitle: { en: 'Create your guardian account', bn: 'আপনার অভিভাবক অ্যাকাউন্ট তৈরি করুন' },
  fullNamePlaceholder: { en: 'Full name', bn: 'পূর্ণ নাম' },
  passwordSignupPlaceholder: {
    en: 'Password (min 6 characters)',
    bn: 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)',
  },
  signUpButton: { en: 'Sign Up', bn: 'সাইন আপ' },
  creatingAccountButton: { en: 'Creating account…', bn: 'অ্যাকাউন্ট তৈরি হচ্ছে…' },
  hasAccountQuestion: { en: 'Already have an account?', bn: 'ইতিমধ্যে অ্যাকাউন্ট আছে?' },
  signInNow: { en: 'Sign in', bn: 'সাইন ইন করুন' },

  // --- Legal links (login + signup forms) ---
  agreeToTermsPrefix: {
    en: 'By continuing, you agree to our',
    bn: 'চালিয়ে যাওয়ার মাধ্যমে, আপনি আমাদের',
  },
  termsOfServiceLink: { en: 'Terms of Service', bn: 'সেবার শর্তাবলী' },
  agreeToTermsAnd: { en: 'and', bn: 'এবং' },
  privacyPolicyLink: { en: 'Privacy Policy', bn: 'গোপনীয়তা নীতি' },

  // --- Dashboard home ---
  dashboardTitle: { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  dashboardSubtitle: {
    en: "People you're linked to as a guardian.",
    bn: 'আপনি যাদের সাথে অভিভাবক হিসেবে যুক্ত আছেন।',
  },
  noLinkedUsersYet: {
    en: "You're not linked to anyone yet — use the form above to link to someone using the invite code they share with you.",
    bn: 'আপনি এখনো কারো সাথে যুক্ত নন — উপরের ফর্ম ব্যবহার করে তাদের দেওয়া আমন্ত্রণ কোড দিয়ে যুক্ত হন।',
  },
  unnamedUser: { en: 'Unnamed user', bn: 'নামহীন ব্যবহারকারী' },

  // --- Active alerts card ---
  activeAlertLabel: { en: 'Active Alert', bn: 'সক্রিয় অ্যালার্ট' },
  missedCheckinLabel: { en: 'Missed Check-in', bn: 'চেক-ইন মিস হয়েছে' },
  viewLastKnownLocation: { en: 'View last known location', bn: 'সর্বশেষ জানা অবস্থান দেখুন' },
  noLocationAvailableYet: {
    en: 'No location available yet.',
    bn: 'এখনো কোনো অবস্থান পাওয়া যায়নি।',
  },
  markResolvedButton: { en: 'Mark Resolved', bn: 'সমাধান হয়েছে চিহ্নিত করুন' },
  markingResolvedButton: { en: 'Marking resolved…', bn: 'সমাধান চিহ্নিত করা হচ্ছে…' },
  secondsAgo: { en: '{n}s ago', bn: '{n} সেকেন্ড আগে' },
  minutesAgo: { en: '{n}m ago', bn: '{n} মিনিট আগে' },
  hoursAgo: { en: '{n}h ago', bn: '{n} ঘণ্টা আগে' },

  // --- Past alerts section ---
  pastAlertsTitle: { en: 'Past Alerts', bn: 'পূর্ববর্তী অ্যালার্ট' },
  noResolvedAlertsYet: {
    en: 'No resolved alerts yet.',
    bn: 'এখনো কোনো সমাধান হওয়া অ্যালার্ট নেই।',
  },
  noLocationRecorded: { en: 'No location recorded', bn: 'কোনো অবস্থান রেকর্ড করা হয়নি' },
  activeForLessThanMinute: {
    en: 'Active for less than a minute',
    bn: 'এক মিনিটেরও কম সময় সক্রিয় ছিল',
  },
  activeForMinutes: { en: 'Active for {n} minute{s}', bn: '{n} মিনিট সক্রিয় ছিল' },
  activeForHoursMinutes: { en: 'Active for {h}h {m}m', bn: '{h} ঘণ্টা {m} মিনিট সক্রিয় ছিল' },
  activeForHours: { en: 'Active for {h} hour{s}', bn: '{h} ঘণ্টা সক্রিয় ছিল' },
  activeForDays: { en: 'Active for {d} day{s}', bn: '{d} দিন সক্রিয় ছিল' },

  // --- Link to someone form ---
  linkToSomeoneLabel: { en: 'Link to someone', bn: 'কারো সাথে যুক্ত হন' },
  inviteCodePlaceholder: { en: 'Invite code', bn: 'আমন্ত্রণ কোড' },
  enterInviteCode: { en: 'Enter an invite code.', bn: 'একটি আমন্ত্রণ কোড লিখুন।' },
  invalidOrUsedCode: {
    en: 'That invite code is invalid or has already been used.',
    bn: 'এই আমন্ত্রণ কোডটি সঠিক নয় অথবা ইতিমধ্যে ব্যবহৃত হয়েছে।',
  },
  sessionExpired: {
    en: 'Your session may have expired. Try signing in again.',
    bn: 'আপনার সেশনের মেয়াদ শেষ হয়ে থাকতে পারে। আবার সাইন ইন করার চেষ্টা করুন।',
  },
  nowLinkedTo: { en: "You're now linked to {name}.", bn: 'আপনি এখন {name}-এর সাথে যুক্ত।' },
  thisUserFallback: { en: 'this user', bn: 'এই ব্যবহারকারী' },
  linkButton: { en: 'Link', bn: 'যুক্ত করুন' },
  linkingButton: { en: 'Linking…', bn: 'যুক্ত করা হচ্ছে…' },

  // --- Header ---
  signOutLink: { en: 'Sign out', bn: 'সাইন আউট' },
  languageBn: { en: 'বাংলা', bn: 'বাংলা' },
  languageEn: { en: 'English', bn: 'English' },
} as const satisfies Record<string, Entry>;

export type TranslationKey = keyof typeof translations;

export function t(
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  let str: string = translations[key][language];
  if (params) {
    for (const [paramKey, value] of Object.entries(params)) {
      str = str.replaceAll(`{${paramKey}}`, String(value));
    }
  }
  return str;
}
