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
  // --- Welcome / role selection ---
  welcomeTitle: { en: 'Welcome to SafePath', bn: 'সেফপাথে স্বাগতম' },
  welcomeSubtitle: {
    en: 'Are you signing in as a guardian, or as a student?',
    bn: 'আপনি কি একজন অভিভাবক নাকি একজন শিক্ষার্থী হিসেবে সাইন ইন করছেন?',
  },
  signInAsGuardianButton: { en: 'Sign in as a Guardian', bn: 'অভিভাবক হিসেবে সাইন ইন করুন' },
  signInAsStudentButton: { en: 'Sign in as a Student', bn: 'শিক্ষার্থী হিসেবে সাইন ইন করুন' },
  guardianSignInHeading: { en: 'Guardian Sign In', bn: 'অভিভাবক সাইন ইন' },
  studentSignInHeading: { en: 'Student Sign In', bn: 'শিক্ষার্থী সাইন ইন' },
  guardianSignUpHeading: { en: 'Guardian Sign Up', bn: 'অভিভাবক সাইন আপ' },
  studentSignUpHeading: { en: 'Student Sign Up', bn: 'শিক্ষার্থী সাইন আপ' },

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

  // --- Journeys (Home screen) ---
  startJourneyTitle: { en: 'Start a Journey', bn: 'যাত্রা শুরু করুন' },
  startJourneySubtitle: {
    en: "Let SafePath check that you've arrived. If you don't confirm in time, your guardians are alerted automatically.",
    bn: 'সেফপাথকে আপনার পৌঁছানো নিশ্চিত করতে দিন। আপনি সময়মতো নিশ্চিত না করলে, আপনার অভিভাবকদের স্বয়ংক্রিয়ভাবে জানানো হবে।',
  },
  journeyDurationLabel: { en: 'Expected in', bn: 'প্রত্যাশিত সময়' },
  journeyDurationMinutesOption: { en: '{n} min', bn: '{n} মিনিট' },
  destinationNotePlaceholder: {
    en: 'Where are you headed? (optional)',
    bn: 'আপনি কোথায় যাচ্ছেন? (ঐচ্ছিক)',
  },
  startJourneyButton: { en: 'Start Journey', bn: 'যাত্রা শুরু করুন' },
  journeyCreateError: {
    en: 'Could not start the journey. Try again.',
    bn: 'যাত্রা শুরু করা যায়নি। আবার চেষ্টা করুন।',
  },
  journeyActiveLabel: { en: 'Journey in progress', bn: 'যাত্রা চলছে' },
  journeyDestinationLabel: { en: 'Going to: {note}', bn: 'গন্তব্য: {note}' },
  journeyTimeRemaining: { en: 'Expected to arrive in {n} min', bn: '{n} মিনিটে পৌঁছানোর কথা' },
  journeyOverdueByMinutes: {
    en: 'Expected arrival was {n} min ago',
    bn: 'প্রত্যাশিত পৌঁছানোর সময় {n} মিনিট আগে ছিল',
  },
  arrivedSafelyButton: { en: "I've Arrived Safely", bn: 'আমি নিরাপদে পৌঁছেছি' },
  addFifteenMinutesButton: { en: 'Add 15 more minutes', bn: 'আরও ১৫ মিনিট যোগ করুন' },
  journeyResolveError: {
    en: 'Could not update the journey. Try again.',
    bn: 'যাত্রা আপডেট করা যায়নি। আবার চেষ্টা করুন।',
  },
  journeyExtendError: {
    en: 'Could not add more time. Try again.',
    bn: 'আরও সময় যোগ করা যায়নি। আবার চেষ্টা করুন।',
  },
  journeyAlertTriggeredBanner: {
    en: "You didn't check in in time, so your guardians have been alerted.",
    bn: 'আপনি সময়মতো নিশ্চিত করেননি, তাই আপনার অভিভাবকদের সতর্ক করা হয়েছে।',
  },
  arrivalCheckNotificationTitle: { en: 'Did you arrive safely?', bn: 'আপনি কি নিরাপদে পৌঁছেছেন?' },
  arrivalCheckNotificationBody: {
    en: 'Open SafePath to confirm you arrived, or add more time.',
    bn: 'পৌঁছানো নিশ্চিত করতে, বা আরও সময় যোগ করতে সেফপাথ খুলুন।',
  },

  // --- Nearby lookup (Home screen) ---
  nearestPoliceButton: { en: 'Nearest Police Station', bn: 'নিকটতম থানা' },
  nearestHospitalButton: { en: 'Nearest Hospital', bn: 'নিকটতম হাসপাতাল' },

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

  // --- SOS: offline fallback ---
  noContactsNudgeText: {
    en: 'No emergency contacts saved for offline SOS.',
    bn: 'অফলাইন SOS-এর জন্য কোনো জরুরি যোগাযোগ সংরক্ষিত নেই।',
  },
  addContactsLink: { en: 'Add some', bn: 'যোগ করুন' },
  offlineNoContactsMessage: {
    en: 'No internet connection, and no emergency contacts saved to message instead. Connect to the internet or add emergency contacts in Settings.',
    bn: 'ইন্টারনেট সংযোগ নেই, এবং বার্তা পাঠানোর জন্য কোনো জরুরি যোগাযোগও সংরক্ষিত নেই। ইন্টারনেটে সংযুক্ত হন অথবা সেটিংসে জরুরি যোগাযোগ যোগ করুন।',
  },
  insertFailedNoContactsMessage: {
    en: 'Could not send your alert, and no emergency contacts are saved to message instead. Try again, or add emergency contacts in Settings.',
    bn: 'আপনার অ্যালার্ট পাঠানো যায়নি, এবং বার্তা পাঠানোর জন্য কোনো জরুরি যোগাযোগও সংরক্ষিত নেই। আবার চেষ্টা করুন, অথবা সেটিংসে জরুরি যোগাযোগ যোগ করুন।',
  },
  smsNotAvailableMessage: {
    en: 'SMS is not available on this device.',
    bn: 'এই ডিভাইসে এসএমএস উপলব্ধ নেই।',
  },
  emergencySmsMessage: {
    en: 'EMERGENCY: I need help. {name} triggered an SOS via SafePath at {time}. Last known location: {location}',
    bn: 'জরুরি: আমার সাহায্য দরকার। {name} {time}-এ সেফপাথের মাধ্যমে SOS চালু করেছে। সর্বশেষ জানা অবস্থান: {location}',
  },
  emergencySmsLocationUnavailable: { en: 'unavailable', bn: 'অজানা' },
  emergencySmsNameFallback: { en: 'Someone', bn: 'কেউ একজন' },

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
  emergencyContactsLink: { en: 'Emergency Contacts', bn: 'জরুরি যোগাযোগ' },
  signOutButton: { en: 'Sign Out', bn: 'সাইন আউট' },
  languageLabel: { en: 'Language', bn: 'ভাষা' },
  languageBn: { en: 'বাংলা', bn: 'বাংলা' },
  languageEn: { en: 'English', bn: 'English' },

  // --- Emergency contacts screen ---
  emergencyContactsTitle: { en: 'Emergency Contacts', bn: 'জরুরি যোগাযোগ' },
  emergencyContactsSubtitle: {
    en: "Used to send an SMS for help if you're offline when you trigger SOS.",
    bn: 'আপনি SOS চালু করার সময় অফলাইনে থাকলে সাহায্যের জন্য এসএমএস পাঠাতে ব্যবহৃত হয়।',
  },
  addContactButton: { en: 'Add Contact', bn: 'যোগাযোগ যোগ করুন' },
  namePlaceholder: { en: 'Name', bn: 'নাম' },
  phonePlaceholder: { en: 'Phone number', bn: 'ফোন নম্বর' },
  invalidPhone: { en: 'Enter a valid phone number.', bn: 'একটি সঠিক ফোন নম্বর লিখুন।' },
  saveButton: { en: 'Save', bn: 'সংরক্ষণ করুন' },
  cancelButton: { en: 'Cancel', bn: 'বাতিল' },
  editButton: { en: 'Edit', bn: 'সম্পাদনা' },
  deleteButton: { en: 'Delete', bn: 'মুছুন' },
  deleteContactConfirmTitle: { en: 'Delete contact?', bn: 'যোগাযোগ মুছবেন?' },
  deleteContactConfirmMessage: {
    en: 'This contact will no longer receive offline SOS messages.',
    bn: 'এই যোগাযোগ আর অফলাইন SOS বার্তা পাবেন না।',
  },
  noContactsYet: {
    en: "No emergency contacts yet. These are used to send an SMS for help if you're offline when you trigger SOS — add at least one.",
    bn: 'এখনো কোনো জরুরি যোগাযোগ নেই। আপনি অফলাইনে SOS চালু করলে সাহায্যের জন্য এসএমএস পাঠাতে এগুলো ব্যবহৃত হয় — অন্তত একজনকে যোগ করুন।',
  },
  contactSaveError: {
    en: 'Could not save this contact. Try again.',
    bn: 'এই যোগাযোগ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  },
  contactDeleteError: {
    en: 'Could not delete this contact. Try again.',
    bn: 'এই যোগাযোগ মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',
  },

  // --- Guardian experience ---
  unnamedUser: { en: 'Unnamed user', bn: 'নামহীন ব্যবহারকারী' },
  guardianActiveAlertsTitle: { en: 'Active Alerts', bn: 'সক্রিয় অ্যালার্ট' },
  guardianPastAlertsTitle: { en: 'Past Alerts', bn: 'পূর্ববর্তী অ্যালার্ট' },
  guardianLinkTitle: { en: 'Link to Someone', bn: 'কারো সাথে যুক্ত হন' },
  guardianLinkSubtitle: {
    en: "Enter the invite code the person you're supporting shared with you.",
    bn: 'আপনি যাকে সহায়তা করছেন তার দেওয়া আমন্ত্রণ কোডটি লিখুন।',
  },
  sosAlertTypeLabel: { en: 'SOS', bn: 'SOS' },
  missedCheckinTypeLabel: { en: 'Missed Check-in', bn: 'চেক-ইন মিস হয়েছে' },
  viewLastKnownLocationLink: {
    en: 'View last known location',
    bn: 'সর্বশেষ জানা অবস্থান দেখুন',
  },
  noLocationAvailableYet: {
    en: 'No location available yet.',
    bn: 'এখনো কোনো অবস্থান পাওয়া যায়নি।',
  },
  noLocationRecorded: { en: 'No location recorded', bn: 'কোনো অবস্থান রেকর্ড করা হয়নি' },
  markResolvedButton: { en: 'Mark Resolved', bn: 'সমাধান হয়েছে চিহ্নিত করুন' },
  noActiveAlertsMessage: {
    en: 'No active alerts right now.',
    bn: 'এই মুহূর্তে কোনো সক্রিয় অ্যালার্ট নেই।',
  },
  noResolvedAlertsYet: {
    en: 'No resolved alerts yet.',
    bn: 'এখনো কোনো সমাধান হওয়া অ্যালার্ট নেই।',
  },
  secondsAgo: { en: '{n}s ago', bn: '{n} সেকেন্ড আগে' },
  minutesAgo: { en: '{n}m ago', bn: '{n} মিনিট আগে' },
  hoursAgo: { en: '{n}h ago', bn: '{n} ঘণ্টা আগে' },
  activeForLessThanMinute: {
    en: 'Active for less than a minute',
    bn: 'এক মিনিটেরও কম সময় সক্রিয় ছিল',
  },
  activeForMinutes: { en: 'Active for {n} minute{s}', bn: '{n} মিনিট সক্রিয় ছিল' },
  activeForHoursMinutes: { en: 'Active for {h}h {m}m', bn: '{h} ঘণ্টা {m} মিনিট সক্রিয় ছিল' },
  activeForHours: { en: 'Active for {h} hour{s}', bn: '{h} ঘণ্টা সক্রিয় ছিল' },
  activeForDays: { en: 'Active for {d} day{s}', bn: '{d} দিন সক্রিয় ছিল' },
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
