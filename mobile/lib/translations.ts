// Lightweight custom translation system — not a full i18n library. A flat
// dictionary of { en, bn } pairs plus a pure lookup function, used both by
// the LanguageContext (see language-context.tsx) and anywhere a plain
// language value is more convenient than a hook.
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
  signUpLink: { en: "Don't have an account? Sign up", bn: 'অ্যাকাউন্ট নেই? সাইন আপ করুন' },
  invalidEmail: { en: 'Enter a valid email address.', bn: 'একটি সঠিক ইমেইল ঠিকানা লিখুন।' },
  passwordTooShort: {
    en: 'Password must be at least {n} characters.',
    bn: 'পাসওয়ার্ড কমপক্ষে {n} অক্ষরের হতে হবে।',
  },

  // --- Sign up ---
  signUpTitle: { en: 'Create your SafePath account', bn: 'আপনার সেফপাথ অ্যাকাউন্ট তৈরি করুন' },
  fullNamePlaceholder: { en: 'Full name', bn: 'পূর্ণ নাম' },
  passwordSignupPlaceholder: {
    en: 'Password (min 6 characters)',
    bn: 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)',
  },
  signUpButton: { en: 'Sign Up', bn: 'সাইন আপ' },
  signInLink: {
    en: 'Already have an account? Sign in',
    bn: 'ইতিমধ্যে অ্যাকাউন্ট আছে? সাইন ইন করুন',
  },
  enterYourName: { en: 'Enter your name.', bn: 'আপনার নাম লিখুন।' },
  checkEmailConfirm: {
    en: 'Check your email to confirm your account, then sign in.',
    bn: 'আপনার অ্যাকাউন্ট নিশ্চিত করতে ইমেইল চেক করুন, তারপর সাইন ইন করুন।',
  },

  // --- Home ---
  homeTitle: { en: 'Home', bn: 'হোম' },
  homePlaceholder: {
    en: 'Placeholder screen — no content yet.',
    bn: 'প্লেসহোল্ডার স্ক্রিন — এখনো কোনো কনটেন্ট নেই।',
  },

  // --- SOS ---
  // "SOS" itself is left as the Latin acronym in both languages — it's an
  // internationally recognized distress signal, and translating/
  // transliterating it could actually reduce recognizability in a real
  // emergency. Flag this choice for native-speaker review too.
  sosTitle: { en: 'SOS', bn: 'SOS' },
  sosSubtitle: {
    en: 'SafePath includes your location in SOS alerts so your guardians can find you.',
    bn: 'সেফপাথ আপনার SOS অ্যালার্টে আপনার অবস্থান অন্তর্ভুক্ত করে, যাতে আপনার অভিভাবকরা আপনাকে খুঁজে পেতে পারেন।',
  },
  locationDeniedBanner: {
    en: "Location permission denied — your SOS alert will still work, but won't include your location.",
    bn: 'অবস্থানের অনুমতি দেওয়া হয়নি — আপনার SOS অ্যালার্ট তবুও কাজ করবে, কিন্তু তাতে আপনার অবস্থান থাকবে না।',
  },
  openSettings: { en: 'Open Settings', bn: 'সেটিংস খুলুন' },
  holdForSosLabel: { en: 'HOLD\nFOR SOS', bn: 'SOS-এর জন্য\nধরে রাখুন' },
  holdHint: {
    en: 'Hold for 2 seconds. Release early to cancel.',
    bn: '২ সেকেন্ড ধরে রাখুন। বাতিল করতে আগেই ছেড়ে দিন।',
  },
  sosCreateError: {
    en: 'Could not send the SOS alert. Try again.',
    bn: 'SOS অ্যালার্ট পাঠানো যায়নি। আবার চেষ্টা করুন।',
  },
  alertActiveLabel: { en: 'SOS ALERT ACTIVE', bn: 'SOS অ্যালার্ট সক্রিয়' },
  alertActiveSubtitle: {
    en: 'Sent at {time}. Your accepted guardians have been notified, and your location is being shared every 15 seconds while this screen stays open.',
    bn: '{time}-এ পাঠানো হয়েছে। আপনার অনুমোদিত অভিভাবকদের জানানো হয়েছে, এবং এই স্ক্রিন খোলা থাকা অবস্থায় প্রতি ১৫ সেকেন্ডে আপনার অবস্থান শেয়ার করা হচ্ছে।',
  },
  imSafeNow: { en: "I'm safe now", bn: 'আমি এখন নিরাপদ' },

  // --- Guardians ---
  guardiansTitle: { en: 'Guardians', bn: 'অভিভাবক' },
  inviteGuardianButton: { en: 'Invite a Guardian', bn: 'একজন অভিভাবককে আমন্ত্রণ জানান' },
  shareCodeLabel: {
    en: 'Share this code with your guardian',
    bn: 'আপনার অভিভাবকের সাথে এই কোডটি শেয়ার করুন',
  },
  copyButton: { en: 'Copy', bn: 'কপি করুন' },
  copiedButton: { en: 'Copied!', bn: 'কপি হয়েছে!' },
  shareButton: { en: 'Share', bn: 'শেয়ার করুন' },
  yourGuardiansLabel: { en: 'Your guardians', bn: 'আপনার অভিভাবকরা' },
  noGuardiansYet: {
    en: 'No guardians yet — invite one above and share the code with them.',
    bn: 'এখনো কোনো অভিভাবক নেই — উপরে একজনকে আমন্ত্রণ জানান এবং তাদের সাথে কোডটি শেয়ার করুন।',
  },
  unnamedGuardian: { en: 'Unnamed guardian', bn: 'নামহীন অভিভাবক' },
  acceptedOn: { en: 'Accepted {date}', bn: '{date}-এ গৃহীত' },
  createdOn: { en: 'Created {date}', bn: '{date}-এ তৈরি' },
  statusPending: { en: 'pending', bn: 'অপেক্ষমান' },
  statusAccepted: { en: 'accepted', bn: 'গৃহীত' },
  statusRevoked: { en: 'revoked', bn: 'বাতিল' },
  shareInviteMessage: {
    en: 'Use this SafePath invite code to connect as my guardian: {code}',
    bn: 'আমার অভিভাবক হিসেবে যুক্ত হতে এই সেফপাথ আমন্ত্রণ কোডটি ব্যবহার করুন: {code}',
  },

  // --- Settings ---
  settingsTitle: { en: 'Settings', bn: 'সেটিংস' },
  signedInAs: { en: 'Signed in as {email}', bn: '{email} হিসেবে সাইন ইন করা আছে' },
  signOutButton: { en: 'Sign Out', bn: 'সাইন আউট' },
  languageLabel: { en: 'Language', bn: 'ভাষা' },
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
