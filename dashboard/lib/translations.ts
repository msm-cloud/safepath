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
  // Sign-in accepts either an email or a phone number (resolved server-
  // side via resolve_login_identifier — see lib/auth-actions.ts);
  // sign-up still asks for email and phone as two separate required
  // fields, so emailPlaceholder above is still used there unchanged.
  emailOrPhonePlaceholder: { en: 'Email or Phone Number', bn: 'ইমেইল অথবা ফোন নম্বর' },
  invalidEmailOrPhone: {
    en: 'Enter a valid email address or phone number.',
    bn: 'একটি সঠিক ইমেইল ঠিকানা অথবা ফোন নম্বর লিখুন।',
  },
  passwordPlaceholder: { en: 'Password', bn: 'পাসওয়ার্ড' },
  signInButton: { en: 'Sign In', bn: 'সাইন ইন' },
  signingInButton: { en: 'Signing in…', bn: 'সাইন ইন হচ্ছে…' },
  showPasswordLabel: { en: 'Show password', bn: 'পাসওয়ার্ড দেখান' },
  hidePasswordLabel: { en: 'Hide password', bn: 'পাসওয়ার্ড লুকান' },
  noAccountQuestion: { en: "Don't have an account?", bn: 'অ্যাকাউন্ট নেই?' },
  signUpNow: { en: 'Sign up', bn: 'সাইন আপ করুন' },
  forgotPasswordLink: { en: 'Forgot Password?', bn: 'পাসওয়ার্ড ভুলে গেছেন?' },
  userManualLink: { en: 'Need help? View the user guide', bn: 'সাহায্য দরকার? ব্যবহার নির্দেশিকা দেখুন' },

  // --- Sign up ---
  signUpTitle: { en: 'Create your guardian account', bn: 'আপনার অভিভাবক অ্যাকাউন্ট তৈরি করুন' },
  fullNamePlaceholder: { en: 'Full name', bn: 'পূর্ণ নাম' },
  phonePlaceholder: { en: 'Phone number', bn: 'ফোন নম্বর' },
  passwordSignupPlaceholder: {
    en: 'Password (min 6 characters)',
    bn: 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)',
  },
  signUpButton: { en: 'Sign Up', bn: 'সাইন আপ' },
  creatingAccountButton: { en: 'Creating account…', bn: 'অ্যাকাউন্ট তৈরি হচ্ছে…' },
  hasAccountQuestion: { en: 'Already have an account?', bn: 'ইতিমধ্যে অ্যাকাউন্ট আছে?' },
  signInNow: { en: 'Sign in', bn: 'সাইন ইন করুন' },

  // --- Forgot / reset password ---
  forgotPasswordTitle: { en: 'Reset your password', bn: 'আপনার পাসওয়ার্ড পুনরায় সেট করুন' },
  forgotPasswordSubtitle: {
    en: "Enter the email or phone number on your account, and we'll send you a link to reset your password.",
    bn: 'আপনার অ্যাকাউন্টের ইমেইল অথবা ফোন নম্বর লিখুন, আমরা আপনাকে পাসওয়ার্ড পুনরায় সেট করার একটি লিংক পাঠাবো।',
  },
  sendResetLinkButton: { en: 'Send Reset Link', bn: 'রিসেট লিংক পাঠান' },
  sendingResetLinkButton: { en: 'Sending…', bn: 'পাঠানো হচ্ছে…' },
  // Shown identically whether or not the identifier actually resolved to
  // an account — see app/forgot-password/page.tsx. Never reveal which is
  // true.
  resetLinkSentMessage: {
    en: "If an account exists for that email or phone number, we've sent a link to reset your password.",
    bn: 'যদি সেই ইমেইল অথবা ফোন নম্বরের জন্য কোনো অ্যাকাউন্ট থাকে, আমরা পাসওয়ার্ড পুনরায় সেট করার একটি লিংক পাঠিয়েছি।',
  },
  backToSignInLink: { en: 'Back to Sign In', bn: 'সাইন ইনে ফিরে যান' },
  resetPasswordTitle: { en: 'Set a new password', bn: 'একটি নতুন পাসওয়ার্ড সেট করুন' },
  newPasswordPlaceholder: { en: 'New password', bn: 'নতুন পাসওয়ার্ড' },
  resetPasswordButton: { en: 'Reset Password', bn: 'পাসওয়ার্ড রিসেট করুন' },
  resettingPasswordButton: { en: 'Resetting…', bn: 'রিসেট করা হচ্ছে…' },
  resetLinkVerifying: { en: 'Verifying your reset link…', bn: 'আপনার রিসেট লিংক যাচাই করা হচ্ছে…' },
  invalidOrExpiredResetLink: {
    en: 'This password reset link is invalid or has expired. Request a new one.',
    bn: 'এই পাসওয়ার্ড রিসেট লিংকটি সঠিক নয় অথবা মেয়াদ শেষ হয়ে গেছে। নতুন একটি অনুরোধ করুন।',
  },
  requestNewResetLinkLink: { en: 'Request a new link', bn: 'নতুন একটি লিংক অনুরোধ করুন' },

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

  // --- Live location sharing card ---
  // Only shown while a linked person is actively sharing. The card is
  // removed the instant they stop (Realtime); and if points stop arriving
  // for a few minutes it switches to a "not updating" state instead of
  // implying the last position is current.
  liveLocationTitle: { en: 'Live location', bn: 'লাইভ লোকেশন' },
  liveLocationBadge: { en: 'SHARING LIVE', bn: 'লাইভ শেয়ারিং' },
  liveLocationWaiting: {
    en: 'Waiting for the first location…',
    bn: 'প্রথম অবস্থানের জন্য অপেক্ষা করা হচ্ছে…',
  },
  liveLocationUpdated: { en: 'Updated {ago}', bn: '{ago} আপডেট হয়েছে' },
  liveLocationStaleBadge: { en: 'NOT UPDATING', bn: 'আপডেট হচ্ছে না' },
  liveLocationStale: {
    en: "No update for {ago} — the phone may be offline. This isn't their current position.",
    bn: '{ago} ধরে কোনো আপডেট নেই — ফোনটি অফলাইন থাকতে পারে। এটি তাদের বর্তমান অবস্থান নয়।',
  },
  viewOnMap: { en: 'View on map', bn: 'ম্যাপে দেখুন' },

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
  settingsLink: { en: 'Settings', bn: 'সেটিংস' },
  languageBn: { en: 'বাংলা', bn: 'বাংলা' },
  languageEn: { en: 'English', bn: 'English' },

  // --- Settings page ---
  settingsTitle: { en: 'Settings', bn: 'সেটিংস' },
  phoneSavedMessage: { en: 'Phone number saved.', bn: 'ফোন নম্বর সংরক্ষণ করা হয়েছে।' },
  nameSavedMessage: { en: 'Name saved.', bn: 'নাম সংরক্ষণ করা হয়েছে।' },
  saveButton: { en: 'Save', bn: 'সংরক্ষণ করুন' },
  savingButton: { en: 'Saving…', bn: 'সংরক্ষণ করা হচ্ছে…' },
  invalidPhone: { en: 'Enter a valid phone number.', bn: 'একটি সঠিক ফোন নম্বর লিখুন।' },
  duplicatePhoneError: {
    en: 'That phone number is already registered to another account.',
    bn: 'এই ফোন নম্বরটি ইতিমধ্যে অন্য একটি অ্যাকাউন্টে নিবন্ধিত।',
  },

  // --- Change password (already signed in — distinct from forgot/reset
  // above, which is for someone who ISN'T signed in and doesn't know
  // their password at all). Reused for both the section heading and the
  // submit button, same reuse convention as signInButton/signUpButton. ---
  changePasswordLink: { en: 'Change Password', bn: 'পাসওয়ার্ড পরিবর্তন করুন' },
  currentPasswordPlaceholder: { en: 'Current password', bn: 'বর্তমান পাসওয়ার্ড' },
  confirmNewPasswordPlaceholder: { en: 'Confirm new password', bn: 'নতুন পাসওয়ার্ড নিশ্চিত করুন' },
  currentPasswordIncorrect: {
    en: 'Current password is incorrect.',
    bn: 'বর্তমান পাসওয়ার্ড সঠিক নয়।',
  },
  passwordsDoNotMatch: {
    en: "New passwords don't match.",
    bn: 'নতুন পাসওয়ার্ড দুটি মিলছে না।',
  },
  changingPasswordButton: { en: 'Changing…', bn: 'পরিবর্তন করা হচ্ছে…' },
  passwordChangedMessage: { en: 'Password changed.', bn: 'পাসওয়ার্ড পরিবর্তন করা হয়েছে।' },

  // --- Guardian-only gate (app/guardian-only/page.tsx) ---
  guardianOnlyTitle: { en: 'This dashboard is for guardians', bn: 'এই ড্যাশবোর্ড অভিভাবকদের জন্য' },
  guardianOnlyMessage: {
    en: "This account isn't set up as a guardian, so it can't access the dashboard. Sign in with a guardian account instead, or use the SafePath mobile app.",
    bn: 'এই অ্যাকাউন্টটি অভিভাবক হিসেবে সেট আপ করা নেই, তাই এটি ড্যাশবোর্ড ব্যবহার করতে পারে না। পরিবর্তে একটি অভিভাবক অ্যাকাউন্ট দিয়ে সাইন ইন করুন, অথবা সেফপাথ মোবাইল অ্যাপ ব্যবহার করুন।',
  },
  signInWithGuardianAccountLink: {
    en: 'Sign in with a guardian account',
    bn: 'একটি অভিভাবক অ্যাকাউন্ট দিয়ে সাইন ইন করুন',
  },
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
