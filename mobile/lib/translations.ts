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
  // --- Welcome ---
  // The board pairs the headline with the same line in the other language,
  // so each language's accent line is the other one's headline.
  welcomeHeadline: { en: 'You never walk alone.', bn: 'আপনি কখনো একা নন।' },
  welcomeHeadlineAccent: { en: 'আপনি কখনো একা নন।', bn: 'You never walk alone.' },
  welcomeTagline: {
    en: 'One tap alerts the people who care about you, with your location.',
    bn: 'এক ট্যাপেই আপনার প্রিয়জনেরা আপনার অবস্থানসহ সতর্কবার্তা পান।',
  },
  personaQuestion: { en: 'I am a…', bn: 'আমি একজন…' },
  personaStudent: { en: 'Student', bn: 'শিক্ষার্থী' },
  personaStudentHint: {
    en: 'Campus, coaching and the commute home',
    bn: 'ক্যাম্পাস, কোচিং আর বাড়ি ফেরার পথ',
  },
  personaWorking: { en: 'Working woman', bn: 'কর্মজীবী নারী' },
  personaWorkingHint: {
    en: 'Late shifts, rides and travel for work',
    bn: 'দেরির শিফট, রাইড আর কাজের জন্য যাতায়াত',
  },
  personaGuardian: { en: 'Guardian', bn: 'অভিভাবক' },
  personaGuardianHint: {
    en: 'Parent, sibling or partner looking out',
    bn: 'বাবা-মা, ভাইবোন বা সঙ্গী, যিনি খেয়াল রাখেন',
  },
  locationPrivacyNote: {
    en: 'Your location is shared only when you choose.',
    bn: 'আপনি চাইলেই শুধু আপনার অবস্থান শেয়ার হয়।',
  },
  continueAsPersona: { en: 'Continue as {persona}', bn: '{persona} হিসেবে এগিয়ে যান' },
  haveAccountPrompt: { en: 'Already have an account?', bn: 'আগে থেকেই অ্যাকাউন্ট আছে?' },
  // Sign-up privacy line: prefix, link text, suffix (word order differs in
  // Bangla, so the link sits between two strings).
  signUpPrivacyPrefix: {
    en: 'By creating an account, you agree to the',
    bn: 'অ্যাকাউন্ট তৈরি করে আপনি',
  },
  privacyPolicyLink: { en: 'Privacy Policy', bn: 'গোপনীয়তা নীতি' },
  signUpPrivacySuffix: { en: '.', bn: ' মেনে নিচ্ছেন।' },
  logInLink: { en: 'Log in', bn: 'লগ ইন' },
  backLabel: { en: 'Back', bn: 'ফিরে যান' },
  languageSwitchLabel: { en: 'Language', bn: 'ভাষা' },

  // --- Log in ---
  logInHeadline: { en: 'Welcome back', bn: 'আবার স্বাগতম' },
  logInHeadlineAccent: { en: 'আবার স্বাগতম', bn: 'Welcome back' },
  // Log in accepts either an email or a phone number (phone goes through
  // lib/auth-identifier.ts); sign-up still asks for both separately.
  identifierLabel: { en: 'Phone number or email', bn: 'ফোন নম্বর অথবা ইমেইল' },
  invalidEmailOrPhone: {
    en: 'Enter a valid email address or phone number.',
    bn: 'একটি সঠিক ইমেইল ঠিকানা অথবা ফোন নম্বর লিখুন।',
  },
  passwordLabel: { en: 'Password', bn: 'পাসওয়ার্ড' },
  logInButton: { en: 'Log in', bn: 'লগ ইন' },
  loggingInButton: { en: 'Logging in…', bn: 'লগ ইন হচ্ছে…' },
  newToSafePathPrompt: { en: 'New to SafePath?', bn: 'সেফপাথে নতুন?' },
  createAccountLink: { en: 'Create an account', bn: 'অ্যাকাউন্ট খুলুন' },
  invalidEmail: { en: 'Enter a valid email address.', bn: 'একটি সঠিক ইমেইল ঠিকানা লিখুন।' },
  passwordTooShort: {
    en: 'Password must be at least {n} characters.',
    bn: 'পাসওয়ার্ড কমপক্ষে {n} অক্ষরের হতে হবে।',
  },
  showPasswordLabel: { en: 'Show password', bn: 'পাসওয়ার্ড দেখান' },
  hidePasswordLabel: { en: 'Hide password', bn: 'পাসওয়ার্ড লুকান' },
  // Shown for a wrong password and for a phone with no account alike, so
  // the two can't be told apart — see sign-in.tsx.
  invalidCredentials: { en: 'Invalid login credentials', bn: 'সাইন ইন তথ্য সঠিক নয়।' },
  emailNotConfirmed: {
    en: 'Confirm your email address first, then sign in.',
    bn: 'প্রথমে আপনার ইমেইল ঠিকানা নিশ্চিত করুন, তারপর সাইন ইন করুন।',
  },
  tooManyAttempts: {
    en: 'Too many attempts. Please try again later.',
    bn: 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।',
  },
  signInUnavailable: {
    en: "Couldn't sign in right now. Check your connection and try again.",
    bn: 'এই মুহূর্তে সাইন ইন করা যাচ্ছে না। আপনার ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
  },
  loggingInAs: { en: 'Logging in as {persona}', bn: '{persona} হিসেবে লগ ইন' },
  // The welcome-screen card didn't match the account's profiles.role.
  roleMismatchGuardian: {
    en: 'This is a guardian account. Please sign in as Guardian.',
    bn: 'এটি একটি অভিভাবক অ্যাকাউন্ট। অভিভাবক হিসেবে সাইন ইন করুন।',
  },
  roleMismatchUser: {
    en: 'This is a Student or Working woman account. Please sign in as Student or Working woman.',
    bn: 'এটি একটি শিক্ষার্থী বা কর্মজীবী নারীর অ্যাকাউন্ট। শিক্ষার্থী বা কর্মজীবী নারী হিসেবে সাইন ইন করুন।',
  },
  switchToPersona: { en: 'Sign in as {persona}', bn: '{persona} হিসেবে সাইন ইন করুন' },
  forgotPasswordLink: { en: 'Forgot password?', bn: 'পাসওয়ার্ড ভুলে গেছেন?' },
  userManualLink: {
    en: 'Need help? View the user guide',
    bn: 'সাহায্য দরকার? ব্যবহার নির্দেশিকা দেখুন',
  },
  // Generic busy label for buttons that send something.
  sendingLabel: { en: 'Sending…', bn: 'পাঠানো হচ্ছে…' },

  // --- Sign up ---
  signingUpAs: { en: 'Signing up as {persona}', bn: '{persona} হিসেবে সাইন আপ' },
  changeLink: { en: 'Change', bn: 'বদলান' },
  signUpTitle: { en: 'Create your account', bn: 'আপনার অ্যাকাউন্ট খুলুন' },
  fullNameLabel: { en: 'Full name', bn: 'পূর্ণ নাম' },
  fullNamePlaceholder: { en: 'Your name', bn: 'আপনার নাম' },
  phoneLabel: { en: 'Phone number', bn: 'ফোন নম্বর' },
  emailLabel: { en: 'Email', bn: 'ইমেইল' },
  passwordSignupHelper: {
    en: 'At least {n} characters',
    bn: 'কমপক্ষে {n} অক্ষর',
  },
  createAccountButton: { en: 'Create account', bn: 'অ্যাকাউন্ট খুলুন' },
  creatingAccountButton: { en: 'Creating account…', bn: 'অ্যাকাউন্ট খোলা হচ্ছে…' },
  enterYourName: { en: 'Enter your name.', bn: 'আপনার নাম লিখুন।' },
  checkEmailConfirm: {
    en: 'Check your email to confirm your account, then sign in.',
    bn: 'আপনার অ্যাকাউন্ট নিশ্চিত করতে ইমেইল চেক করুন, তারপর সাইন ইন করুন।',
  },
  duplicatePhoneError: {
    en: 'That phone number is already registered to another account.',
    bn: 'এই ফোন নম্বরটি ইতিমধ্যে অন্য একটি অ্যাকাউন্টে নিবন্ধিত।',
  },
  // components/ui/PhoneNotSavedNotice.tsx
  phoneNotSavedMessage: {
    en: "The phone number you signed up with wasn't saved. It may already be linked to another account. Add a phone number to sign in with it.",
    bn: 'সাইন আপের সময় দেওয়া ফোন নম্বরটি সংরক্ষণ করা যায়নি। এটি হয়তো অন্য কোনো অ্যাকাউন্টের সাথে যুক্ত। ফোন নম্বর দিয়ে সাইন ইন করতে একটি ফোন নম্বর যোগ করুন।',
  },
  phoneNotSavedAction: { en: 'Add phone number', bn: 'ফোন নম্বর যোগ করুন' },

  // --- Forgot / reset password ---
  forgotPasswordTitle: { en: 'Reset your password', bn: 'আপনার পাসওয়ার্ড পুনরায় সেট করুন' },
  forgotPasswordSubtitle: {
    en: "Enter the email or phone number on your account, and we'll send you a link to reset your password.",
    bn: 'আপনার অ্যাকাউন্টের ইমেইল অথবা ফোন নম্বর লিখুন, আমরা আপনাকে পাসওয়ার্ড পুনরায় সেট করার একটি লিংক পাঠাবো।',
  },
  sendResetLinkButton: { en: 'Send reset link', bn: 'রিসেট লিংক পাঠান' },
  // Shown identically whether or not the identifier actually resolved to
  // an account — see forgot-password.tsx. Never reveal which is true.
  resetLinkSentMessage: {
    en: "If an account exists for that email or phone number, we've sent a link to reset your password.",
    bn: 'যদি সেই ইমেইল অথবা ফোন নম্বরের জন্য কোনো অ্যাকাউন্ট থাকে, আমরা পাসওয়ার্ড পুনরায় সেট করার একটি লিংক পাঠিয়েছি।',
  },
  backToSignInLink: { en: 'Back to log in', bn: 'লগ ইনে ফিরে যান' },
  resetPasswordTitle: { en: 'Set a new password', bn: 'একটি নতুন পাসওয়ার্ড সেট করুন' },
  newPasswordLabel: { en: 'New password', bn: 'নতুন পাসওয়ার্ড' },
  resetPasswordButton: { en: 'Reset password', bn: 'পাসওয়ার্ড রিসেট করুন' },
  resettingPasswordButton: { en: 'Resetting…', bn: 'রিসেট করা হচ্ছে…' },
  resetLinkVerifying: { en: 'Verifying your reset link…', bn: 'আপনার রিসেট লিংক যাচাই করা হচ্ছে…' },
  invalidOrExpiredResetLink: {
    en: 'This password reset link is invalid or has expired. Request a new one.',
    bn: 'এই পাসওয়ার্ড রিসেট লিংকটি সঠিক নয় অথবা মেয়াদ শেষ হয়ে গেছে। নতুন একটি অনুরোধ করুন।',
  },
  requestNewResetLinkLink: { en: 'Request a new link', bn: 'নতুন একটি লিংক অনুরোধ করুন' },

  // --- Change password (already signed in — distinct from forgot/reset
  // above, which is for someone who ISN'T signed in and doesn't know
  // their password at all). Reused for the Settings link, the screen's
  // header title, and the submit button — same short-string-reuse
  // convention as signInButton/signUpButton already documented in
  // app/(auth)/_layout.tsx. ---
  changePasswordLink: { en: 'Change Password', bn: 'পাসওয়ার্ড পরিবর্তন করুন' },
  currentPasswordLabel: { en: 'Current password', bn: 'বর্তমান পাসওয়ার্ড' },
  confirmNewPasswordLabel: { en: 'Confirm new password', bn: 'নতুন পাসওয়ার্ড নিশ্চিত করুন' },
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

  // --- Home ---
  homeTitle: { en: 'Home', bn: 'হোম' },
  homeGreetingMorning: { en: 'Good morning', bn: 'শুভ সকাল' },
  homeGreetingAfternoon: { en: 'Good afternoon', bn: 'শুভ অপরাহ্ন' },
  homeGreetingEvening: { en: 'Good evening', bn: 'শুভ সন্ধ্যা' },
  homeAddGuardian: { en: 'Add a guardian', bn: 'অভিভাবক যোগ করুন' },
  homeGuardianCountOne: { en: '1 guardian', bn: '১ জন অভিভাবক' },
  homeGuardianCountOther: { en: '{n} guardians', bn: '{n} জন অভিভাবক' },
  homeSosShortcutLabel: { en: 'Open the SOS screen', bn: 'SOS স্ক্রিন খুলুন' },
  homeSosShortcutHint: {
    en: 'Hold the button there to send an alert.',
    bn: 'সতর্কবার্তা পাঠাতে সেখানে বোতামটি চেপে ধরুন।',
  },
  homeSosShortcutCaption: { en: 'Open SOS', bn: 'SOS খুলুন' },
  homeStatusOnline: { en: 'Online', bn: 'অনলাইন' },
  homeStatusOffline: { en: 'Offline', bn: 'অফলাইন' },

  // --- Journeys (Home screen) ---
  startJourneyTitle: { en: 'Start a Journey', bn: 'যাত্রা শুরু করুন' },
  startJourneySubtitle: {
    en: "Let SafePath check that you've arrived. If you don't confirm in time, your guardians are alerted automatically.",
    bn: 'সেফপাথকে আপনার পৌঁছানো নিশ্চিত করতে দিন। আপনি সময়মতো নিশ্চিত না করলে, আপনার অভিভাবকদের স্বয়ংক্রিয়ভাবে জানানো হবে।',
  },
  journeyDurationLabel: { en: 'Expected in', bn: 'প্রত্যাশিত সময়' },
  journeyDurationMinutesOption: { en: '{n} min', bn: '{n} মিনিট' },
  journeyDestinationNoteLabel: { en: 'Destination', bn: 'গন্তব্য' },
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

  // --- Fake call escape (Home screen) ---
  fakeCallButton: { en: 'Fake Call', bn: 'ভুয়া কল' },

  // --- Fake call setup (app/(tabs)/fake-call.tsx) ---
  fakeCallSetupTitle: { en: 'Fake call', bn: 'ভুয়া কল' },
  fakeCallSetupIntro: {
    en: 'Your phone rings like a normal call, so you have a reason to leave. SafePath does not appear on the call screen.',
    bn: 'আপনার ফোনে সাধারণ কলের মতো রিং হবে, যাতে সেখান থেকে চলে যাওয়ার একটা কারণ পান। কল স্ক্রিনে SafePath দেখা যাবে না।',
  },
  fakeCallWhoIsCalling: { en: 'Who is calling', bn: 'কে কল করছে' },
  fakeCallCallerAmmu: { en: 'Ammu', bn: 'আম্মু' },
  fakeCallCallerAbbu: { en: 'Abbu', bn: 'আব্বু' },
  // Two letters in the round badge next to each caller.
  fakeCallCallerAmmuInitials: { en: 'AM', bn: 'মা' },
  fakeCallCallerAbbuInitials: { en: 'AB', bn: 'বা' },
  fakeCallCallerOther: { en: 'Other name', bn: 'অন্য নাম' },
  fakeCallOtherNameMissing: {
    en: 'Enter the name to show on the call.',
    bn: 'কলে যে নাম দেখাবে, সেটি লিখুন।',
  },
  fakeCallRingOutLoud: { en: 'Ring out loud', bn: 'শব্দ করে রিং হবে' },
  fakeCallRingOutLoudHint: { en: 'Off: vibrate only', bn: 'বন্ধ থাকলে শুধু ভাইব্রেট হবে' },
  fakeCallRingNow: { en: 'Ring now', bn: 'এখনই রিং করুন' },

  // --- Fake call screen (components/FakeCallFlow.tsx) ---
  fakeCallIncomingLabel: { en: 'Incoming call', bn: 'ইনকামিং কল' },
  fakeCallAcceptButton: { en: 'Accept', bn: 'গ্রহণ করুন' },
  fakeCallDeclineButton: { en: 'Decline', bn: 'প্রত্যাখ্যান করুন' },
  fakeCallInCallLabel: { en: 'On call', bn: 'কলে আছেন' },
  fakeCallEndButton: { en: 'End Call', bn: 'কল শেষ করুন' },

  // --- Live location sharing (Home screen + Android tracking notification) ---
  // Android shows liveSharingNotification* as a persistent notification for
  // the whole time sharing is on — it's what keeps the tracking visible and
  // non-covert, so the wording must make the current state obvious.
  liveSharingNotificationTitle: {
    en: 'Sharing your live location',
    bn: 'আপনার লাইভ লোকেশন শেয়ার করা হচ্ছে',
  },
  liveSharingNotificationBody: {
    en: 'Your guardians can see where you are until you turn this off.',
    bn: 'আপনি বন্ধ না করা পর্যন্ত আপনার অভিভাবকরা আপনার অবস্থান দেখতে পারবেন।',
  },
  liveSharingTitle: { en: 'Share Live Location', bn: 'লাইভ লোকেশন শেয়ার করুন' },
  liveSharingSubtitle: {
    en: "Let your guardians see where you are in real time. You're in control — turn it off whenever you want.",
    bn: 'আপনার অভিভাবকরা যেন সরাসরি আপনার অবস্থান দেখতে পারেন। নিয়ন্ত্রণ আপনার হাতেই — যখন খুশি বন্ধ করে দিন।',
  },
  liveSharingOnStatus: {
    en: "You're sharing your live location with your guardians.",
    bn: 'আপনি আপনার অভিভাবকদের সাথে লাইভ লোকেশন শেয়ার করছেন।',
  },
  liveSharingForegroundWarning: {
    en: '"Allow all the time" is off, so your guardians won\'t get updates while your phone is locked or SafePath is closed. Tap to fix this in Settings.',
    bn: '"সব সময় অনুমতি দিন" বন্ধ আছে, তাই আপনার ফোন লক থাকলে বা সেফপাথ বন্ধ থাকলে আপনার অভিভাবকরা নতুন তথ্য পাবেন না। সেটিংসে ঠিক করতে ট্যাপ করুন।',
  },
  liveSharingPermissionDenied: {
    en: 'SafePath needs location permission to share your location. Turn it on in Settings.',
    bn: 'আপনার অবস্থান শেয়ার করতে সেফপাথের লোকেশন অনুমতি প্রয়োজন। সেটিংসে এটি চালু করুন।',
  },
  liveSharingStartError: {
    en: "Couldn't start location sharing. Try again.",
    bn: 'লোকেশন শেয়ারিং শুরু করা যায়নি। আবার চেষ্টা করুন।',
  },
  liveSharingStopError: {
    en: "Couldn't stop location sharing. Try again.",
    bn: 'লোকেশন শেয়ারিং বন্ধ করা যায়নি। আবার চেষ্টা করুন।',
  },
  liveSharingAlreadyElsewhere: {
    en: "You're already sharing your location from another device. Turn it off there first.",
    bn: 'আপনি ইতিমধ্যে অন্য একটি ডিভাইস থেকে আপনার অবস্থান শেয়ার করছেন। প্রথমে সেখানে বন্ধ করুন।',
  },

  // --- Recorded live location / location history (Home screen + Android
  // recording notification) ---
  // Separate feature from live sharing above: a slower breadcrumb trail a
  // guardian can look back over, not a real-time stream. Same non-covert
  // principle — a persistent notification runs the whole time it's on, and
  // the Home card shows a standing "recording is on" banner.
  locationHistoryNotificationTitle: {
    en: 'Recording your location history',
    bn: 'আপনার লোকেশন ইতিহাস রেকর্ড করা হচ্ছে',
  },
  locationHistoryNotificationBody: {
    en: 'You turned this on. Turn it off anytime from the Home screen.',
    bn: 'আপনি এটি চালু করেছেন। হোম স্ক্রিন থেকে যেকোনো সময় বন্ধ করতে পারেন।',
  },
  locationHistoryTitle: { en: 'Location History Recording', bn: 'লোকেশন ইতিহাস রেকর্ডিং' },
  locationHistorySubtitle: {
    en: "Save a location snapshot every few minutes so your guardians can look back over where you've been. Separate from live sharing — turn it off whenever you want.",
    bn: 'প্রতি কয়েক মিনিট অন্তর আপনার অবস্থান সংরক্ষণ করুন, যাতে আপনার অভিভাবকরা আপনি কোথায় ছিলেন তা দেখতে পারেন। লাইভ শেয়ারিং থেকে আলাদা — যখন খুশি বন্ধ করুন।',
  },
  locationHistoryOnStatus: {
    en: "You're recording your location history. Your guardians can see the saved trail.",
    bn: 'আপনি আপনার লোকেশন ইতিহাস রেকর্ড করছেন। আপনার অভিভাবকরা সংরক্ষিত পথটি দেখতে পারবেন।',
  },
  locationHistoryForegroundWarning: {
    en: '"Allow all the time" is off, so nothing is saved while your phone is locked or SafePath is closed. Tap to fix this in Settings.',
    bn: '"সব সময় অনুমতি দিন" বন্ধ আছে, তাই আপনার ফোন লক থাকলে বা সেফপাথ বন্ধ থাকলে কিছুই সংরক্ষণ হয় না। সেটিংসে ঠিক করতে ট্যাপ করুন।',
  },
  locationHistoryPermissionDenied: {
    en: 'Location history needs "Allow all the time" location access. Turn it on in Settings.',
    bn: 'লোকেশন ইতিহাসের জন্য "সব সময় অনুমতি দিন" লোকেশন অ্যাক্সেস প্রয়োজন। সেটিংসে এটি চালু করুন।',
  },
  locationHistoryStartError: {
    en: "Couldn't start location history recording. Try again.",
    bn: 'লোকেশন ইতিহাস রেকর্ডিং শুরু করা যায়নি। আবার চেষ্টা করুন।',
  },
  locationHistoryStopError: {
    en: "Couldn't stop location history recording. Try again.",
    bn: 'লোকেশন ইতিহাস রেকর্ডিং বন্ধ করা যায়নি। আবার চেষ্টা করুন।',
  },
  locationHistorySaveError: {
    en: "Couldn't save that change. Check your connection and try again.",
    bn: 'পরিবর্তনটি সংরক্ষণ করা যায়নি। আপনার সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
  },
  // Retention presets — shared by the student's per-guardian control
  // (Guardians screen) and the guardian's own screen.
  locationHistoryRetention6h: { en: '6 hours', bn: '৬ ঘণ্টা' },
  locationHistoryRetention24h: { en: '24 hours', bn: '২৪ ঘণ্টা' },
  locationHistoryRetention3d: { en: '3 days', bn: '৩ দিন' },
  locationHistoryRetention7d: { en: '7 days', bn: '৭ দিন' },
  locationHistoryRetentionLabel: { en: 'Keep history for', bn: 'ইতিহাস রাখুন' },
  locationHistoryViewTrail: { en: 'View trail', bn: 'পথ দেখুন' },
  locationHistoryHideTrail: { en: 'Hide trail', bn: 'পথ লুকান' },

  // --- Guardian: share my location (reciprocal to the student's own
  // Location History Recording above) — a guardian's own recording
  // toggle, reachable from Settings since the guardian tab bar has no
  // Home-screen card equivalent to put it on directly. Writes to the same
  // profiles.location_history_enabled / location_history_points as the
  // student side; only who can read it back differs (see
  // location_history_points_select_user_reads_guardian_in_window RLS).
  guardianShareLocationLink: { en: 'Share My Location', bn: 'আমার অবস্থান শেয়ার করুন' },
  guardianShareLocationTitle: { en: 'Share My Location', bn: 'আমার অবস্থান শেয়ার করুন' },
  guardianShareLocationSubtitle: {
    en: "Save a location snapshot every few minutes so the people you support can look back over where you've been. Turn it off anytime.",
    bn: 'প্রতি কয়েক মিনিট অন্তর আপনার অবস্থান সংরক্ষণ করুন, যাতে আপনি যাদের সহায়তা করেন তারা আপনি কোথায় ছিলেন তা দেখতে পারে। যেকোনো সময় বন্ধ করুন।',
  },
  guardianShareLocationOnStatus: {
    en: "You're sharing your location history. The people you support can see the saved trail.",
    bn: 'আপনি আপনার অবস্থানের ইতিহাস শেয়ার করছেন। আপনি যাদের সহায়তা করেন তারা সংরক্ষিত পথটি দেখতে পারবে।',
  },
  guardianShareLocationForegroundWarning: {
    en: '"Allow all the time" is off, so nothing is saved while your phone is locked or SafePath is closed. Tap to fix this in Settings.',
    bn: '"সব সময় অনুমতি দিন" বন্ধ আছে, তাই আপনার ফোন লক থাকলে বা সেফপাথ বন্ধ থাকলে কিছুই সংরক্ষণ হয় না। সেটিংসে ঠিক করতে ট্যাপ করুন।',
  },
  guardianShareLocationPermissionDenied: {
    en: 'Sharing your location needs "Allow all the time" location access. Turn it on in Settings.',
    bn: 'আপনার অবস্থান শেয়ার করতে "সব সময় অনুমতি দিন" লোকেশন অ্যাক্সেস প্রয়োজন। সেটিংসে এটি চালু করুন।',
  },
  guardianShareLocationStartError: {
    en: "Couldn't start sharing your location. Try again.",
    bn: 'অবস্থান শেয়ার করা শুরু করা যায়নি। আবার চেষ্টা করুন।',
  },
  guardianShareLocationStopError: {
    en: "Couldn't stop sharing your location. Try again.",
    bn: 'অবস্থান শেয়ার করা বন্ধ করা যায়নি। আবার চেষ্টা করুন।',
  },
  guardianShareLocationSaveError: {
    en: "Couldn't save that change. Check your connection and try again.",
    bn: 'পরিবর্তনটি সংরক্ষণ করা যায়নি। আপনার সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
  },

  // --- Student: my guardian's shared location (reciprocal to the
  // guardian's own "Recorded Location" screen) — reached from the
  // Guardians tab, since that's where the student already manages the
  // link and its retention. Mirrors guardianLocationHistory* below with
  // the roles reversed.
  guardianLocationLink: { en: 'View shared location', bn: 'শেয়ার করা অবস্থান দেখুন' },
  studentGuardianLocationTitle: {
    en: "Guardian's Shared Location",
    bn: 'অভিভাবকের শেয়ার করা অবস্থান',
  },
  studentGuardianLocationSubtitle: {
    en: 'The saved location trail for each guardian who has location sharing turned on.',
    bn: 'যে অভিভাবকদের অবস্থান শেয়ারিং চালু আছে, তাদের প্রত্যেকের সংরক্ষিত অবস্থানের পথ।',
  },
  studentGuardianLocationNoLinks: {
    en: "You don't have any guardians linked yet.",
    bn: 'আপনার সাথে এখনও কোনো অভিভাবক যুক্ত নেই।',
  },
  studentGuardianLocationSharingOn: { en: 'Sharing on', bn: 'শেয়ারিং চালু' },
  studentGuardianLocationSharingOff: { en: 'Sharing off', bn: 'শেয়ারিং বন্ধ' },
  studentGuardianLocationNoPoints: {
    en: 'No points recorded in the last {window}.',
    bn: 'গত {window}-এ কোনো পয়েন্ট রেকর্ড করা হয়নি।',
  },
  studentGuardianLocationPointCount: {
    en: '{n} points in the last {window}',
    bn: 'গত {window}-এ {n}টি পয়েন্ট',
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
  sosHoldCaption: { en: 'Hold 2 seconds', bn: '২ সেকেন্ড ধরে রাখুন' },
  holdHint: {
    en: 'Hold for 2 seconds. Release early to cancel.',
    bn: '২ সেকেন্ড ধরে রাখুন। বাতিল করতে আগেই ছেড়ে দিন।',
  },
  sosCreateError: {
    en: 'Could not send the SOS alert. Try again.',
    bn: 'SOS অ্যালার্ট পাঠানো যায়নি। আবার চেষ্টা করুন।',
  },
  sosActivePill: { en: 'SOS active · {elapsed}', bn: 'SOS সক্রিয় · {elapsed}' },
  sosSharingLocation: { en: 'Sharing location', bn: 'অবস্থান শেয়ার হচ্ছে' },
  sosActiveHeading: {
    en: 'Your guardians have been alerted.',
    bn: 'আপনার অভিভাবকদের জানানো হয়েছে।',
  },
  alertActiveSubtitle: {
    en: 'Sent at {time}. Stay where it is safe if you can. Your location is shared every 15 seconds while this screen stays open.',
    bn: '{time}-এ পাঠানো হয়েছে। সম্ভব হলে নিরাপদ জায়গায় থাকুন। এই স্ক্রিন খোলা থাকা অবস্থায় প্রতি ১৫ সেকেন্ডে আপনার অবস্থান শেয়ার করা হচ্ছে।',
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
  smsComposerFailedMessage: {
    en: 'Could not open the SMS app to message your emergency contacts.',
    bn: 'জরুরি যোগাযোগদের বার্তা পাঠাতে এসএমএস অ্যাপ খোলা যায়নি।',
  },
  callEmergencyNumber: { en: 'Call {number}', bn: '{number}-এ কল করুন' },
  emergencySmsMessage: {
    en: 'EMERGENCY: I need help. {name} triggered an SOS via SafePath at {time}. Last known location: {location}',
    bn: 'জরুরি: আমার সাহায্য দরকার। {name} {time}-এ সেফপাথের মাধ্যমে SOS চালু করেছে। সর্বশেষ জানা অবস্থান: {location}',
  },
  emergencySmsLocationUnavailable: { en: 'unavailable', bn: 'অজানা' },
  emergencySmsNameFallback: { en: 'Someone', bn: 'কেউ একজন' },

  // --- Shake-to-trigger SOS ---
  shakeDetectedTitle: { en: 'Shake detected', bn: 'ঝাঁকুনি শনাক্ত হয়েছে' },
  shakeCountdownMessage: { en: 'Sending SOS in {n}...', bn: '{n}-এ SOS পাঠানো হচ্ছে...' },
  tapAnywhereToCancelHint: {
    en: 'Tap anywhere to cancel',
    bn: 'বাতিল করতে যেকোনো জায়গায় ট্যাপ করুন',
  },

  // --- Guardians ---
  guardiansTitle: { en: 'Guardians', bn: 'অভিভাবক' },
  inviteGuardianButton: { en: 'Invite guardian', bn: 'অভিভাবককে আমন্ত্রণ জানান' },
  inviteCodeTitle: { en: 'Your invite code', bn: 'আপনার আমন্ত্রণ কোড' },
  inviteCodeHint: {
    en: 'Works once, within 24 hours. Share it only with someone you trust.',
    bn: '২৪ ঘণ্টার মধ্যে একবারই কাজ করে। শুধু বিশ্বস্ত কারো সাথে শেয়ার করুন।',
  },
  shareCodeButton: { en: 'Share code', bn: 'কোড শেয়ার করুন' },
  copyButton: { en: 'Copy', bn: 'কপি করুন' },
  copiedButton: { en: 'Copied', bn: 'কপি হয়েছে' },
  howItWorksTitle: { en: 'How it works', bn: 'যেভাবে কাজ করে' },
  unusedCodesLabel: { en: 'Codes not used yet', bn: 'এখনো ব্যবহার না হওয়া কোড' },
  unusedCodeExpires: { en: 'Expires {time}', bn: 'মেয়াদ শেষ {time}' },
  cancelCodeButton: { en: 'Cancel', bn: 'বাতিল করুন' },
  cancelCodeLabel: { en: 'Cancel code {code}', bn: '{code} কোডটি বাতিল করুন' },
  yourGuardiansCount: { en: 'Your guardians · {n}', bn: 'আপনার অভিভাবক · {n}' },
  guardianLinkedMeta: {
    en: 'Linked · gets SOS and journeys',
    bn: 'যুক্ত · SOS আর যাত্রার খবর পান',
  },
  removeGuardianButton: { en: 'Remove', bn: 'সরান' },
  removeGuardianLabel: { en: 'Remove {name}', bn: '{name}-কে সরান' },
  noGuardiansYet: {
    en: 'No guardians yet. Ask a family member to install SafePath and send you an invite code.',
    bn: 'এখনো কোনো অভিভাবক নেই। পরিবারের একজনকে সেফপাথ ইনস্টল করে আপনাকে একটি আমন্ত্রণ কোড পাঠাতে বলুন।',
  },
  unnamedGuardian: { en: 'Unnamed guardian', bn: 'নামহীন অভিভাবক' },
  shareInviteMessage: {
    en: 'Use this SafePath invite code to connect as my guardian: {code}',
    bn: 'আমার অভিভাবক হিসেবে যুক্ত হতে এই সেফপাথ আমন্ত্রণ কোডটি ব্যবহার করুন: {code}',
  },
  guardianUpdateFailed: {
    en: "Couldn't update your guardians. Check your connection and try again.",
    bn: 'অভিভাবকদের তথ্য আপডেট করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
  },
  // Share-only: asks a family member to install the app and send a code.
  inviteGuardianShareMessage: {
    en: 'Can you be my guardian on SafePath? Install SafePath, sign up as a guardian, tap Invite and send me the code.',
    bn: 'সেফপাথে আপনি কি আমার অভিভাবক হবেন? সেফপাথ ইনস্টল করে অভিভাবক হিসেবে সাইন আপ করুন, তারপর "আমন্ত্রণ"-এ ট্যাপ করে আমাকে কোডটি পাঠান।',
  },
  haveInviteCodeLabel: { en: 'Have an invite code?', bn: 'আমন্ত্রণ কোড আছে?' },
  inviteCodeExample: { en: 'e.g. K7Q9 2MXZ', bn: 'যেমন K7Q9 2MXZ' },
  checkCodeButton: { en: 'Check', bn: 'যাচাই করুন' },
  checkingCode: { en: 'Checking…', bn: 'যাচাই করা হচ্ছে…' },
  // One message whatever the reason, so a code's state can't be probed.
  inviteCodeInvalid: {
    en: "That code didn't work. Check it with your family member or ask them for a new one.",
    bn: 'এই কোডটি কাজ করেনি। পরিবারের সদস্যের সাথে কোডটি মিলিয়ে দেখুন অথবা নতুন একটি কোড চেয়ে নিন।',
  },
  inviteCodeRateLimited: {
    en: 'Too many tries. Try again in {n} min.',
    bn: 'অনেকবার চেষ্টা করা হয়েছে। {n} মিনিট পরে আবার চেষ্টা করুন।',
  },
  inviteActionFailed: {
    en: 'Something went wrong. Check your connection and try again.',
    bn: 'কিছু একটা সমস্যা হয়েছে। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
  },
  requestCardTitle: { en: '{name} wants to be your guardian', bn: '{name} আপনার অভিভাবক হতে চান' },
  requestCardSubtitle: { en: 'Review before accepting', bn: 'গ্রহণ করার আগে দেখে নিন' },
  reviewButton: { en: 'Review', bn: 'দেখুন' },
  // Older-app entry: a guardian on 1.1/1.2 can only redeem a student's code.
  olderAppGuardianToggle: {
    en: 'Guardian has an older SafePath?',
    bn: 'অভিভাবকের ফোনে সেফপাথের পুরোনো ভার্সন?',
  },
  olderAppGuardianHint: {
    en: "Older versions can't create invite codes. Make a code here and they enter it in Link to Someone. They're linked as soon as they enter it.",
    bn: 'পুরোনো ভার্সনে আমন্ত্রণ কোড তৈরি করা যায় না। এখানে একটি কোড তৈরি করুন, তারপর তারা "কারো সাথে যুক্ত হন"-এ কোডটি লিখবেন। কোড লেখার সাথে সাথেই তারা যুক্ত হয়ে যাবেন।',
  },
  olderAppCreateCodeButton: { en: 'Create a code for them', bn: 'তাদের জন্য একটি কোড তৈরি করুন' },

  // --- Guardian request review ---
  guardianRequestTitle: { en: 'Guardian request', bn: 'অভিভাবক হওয়ার অনুরোধ' },
  requestCodeLine: { en: 'Code {code}', bn: 'কোড {code}' },
  requestCodePhoneLine: {
    en: 'Code {code} · phone ending ••{digits}',
    bn: 'কোড {code} · ফোন নম্বরের শেষে ••{digits}',
  },
  requestWillTitle: { en: 'If you accept, {name} will', bn: 'গ্রহণ করলে {name}' },
  requestWillSos: {
    en: 'Get your SOS alerts with your location',
    bn: 'আপনার অবস্থানসহ SOS অ্যালার্ট পাবেন',
  },
  requestWillJourneys: {
    en: 'Get journey check-ins and missed check-in alerts',
    bn: 'যাত্রার চেক-ইন আর মিস হওয়া চেক-ইনের অ্যালার্ট পাবেন',
  },
  requestWillLive: {
    en: 'See your live location only while you share it',
    bn: 'আপনি শেয়ার করার সময়েই শুধু আপনার লাইভ লোকেশন দেখবেন',
  },
  requestWillHistory: {
    en: 'See your location history only if you turn it on',
    bn: 'আপনি চালু করলে তবেই আপনার অবস্থানের ইতিহাস দেখবেন',
  },
  requestPressureNote: {
    en: "Don't know this person, or someone is pressuring you? Decline. You can remove a guardian any time.",
    bn: 'এই ব্যক্তিকে চেনেন না, বা কেউ আপনাকে চাপ দিচ্ছে? প্রত্যাখ্যান করুন। আপনি যেকোনো সময় একজন অভিভাবককে সরিয়ে দিতে পারেন।',
  },
  acceptGuardianButton: {
    en: 'Accept {name} as guardian',
    bn: '{name}-কে অভিভাবক হিসেবে গ্রহণ করুন',
  },
  acceptingRequest: { en: 'Accepting…', bn: 'গ্রহণ করা হচ্ছে…' },
  declineRequestButton: { en: 'Decline', bn: 'প্রত্যাখ্যান করুন' },
  decliningRequest: { en: 'Declining…', bn: 'প্রত্যাখ্যান করা হচ্ছে…' },
  requestNoLongerActive: {
    en: 'This request is no longer active. Ask your family member for a new code.',
    bn: 'এই অনুরোধটি আর সক্রিয় নেই। পরিবারের সদস্যের কাছে নতুন একটি কোড চেয়ে নিন।',
  },
  requestLoadFailed: {
    en: "Couldn't load this request. Check your connection and try again.",
    bn: 'অনুরোধটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
  },
  tryAgainButton: { en: 'Try again', bn: 'আবার চেষ্টা করুন' },
  backToGuardiansButton: { en: 'Back to Guardians', bn: 'অভিভাবক পাতায় ফিরে যান' },

  // --- Remove guardian ---
  removeGuardianTitle: {
    en: 'Remove {name} as your guardian?',
    bn: '{name}-কে আপনার অভিভাবক থেকে সরাবেন?',
  },
  removeGuardianStopsAlerts: {
    en: '{name} will stop getting your SOS alerts and journey check-ins',
    bn: '{name} আর আপনার SOS সতর্কবার্তা ও যাত্রার খবর পাবেন না',
  },
  removeGuardianStopsLocation: {
    en: '{name} will no longer see your location or history',
    bn: '{name} আর আপনার অবস্থান বা অবস্থানের ইতিহাস দেখতে পাবেন না',
  },
  removeGuardianRelink: {
    en: 'To link again later, you will need a new invite.',
    bn: 'পরে আবার যুক্ত হতে নতুন আমন্ত্রণ লাগবে।',
  },
  removeGuardianConfirm: { en: 'Remove guardian', bn: 'অভিভাবক সরান' },
  removingGuardian: { en: 'Removing…', bn: 'সরানো হচ্ছে…' },
  keepGuardianButton: { en: 'Keep {name}', bn: '{name}-কে রাখুন' },

  // --- Settings ---
  settingsTitle: { en: 'Settings', bn: 'সেটিংস' },
  signedInAs: { en: 'Signed in as {email}', bn: '{email} হিসেবে সাইন ইন করা আছে' },
  // Role badge (components/ui/RoleBadge.tsx) — shown at the top of the first
  // post-sign-in screen (Home for students, Active Alerts for guardians)
  // and again in Settings next to signedInAs above.
  signedInAsGuardianBadge: { en: 'Signed in as Guardian', bn: 'অভিভাবক হিসেবে সাইন ইন করা আছে' },
  signedInAsStudentBadge: { en: 'Signed in as Student', bn: 'শিক্ষার্থী হিসেবে সাইন ইন করা আছে' },
  emergencyContactsLink: { en: 'Emergency Contacts', bn: 'জরুরি যোগাযোগ' },
  phoneSavedMessage: { en: 'Phone number saved.', bn: 'ফোন নম্বর সংরক্ষণ করা হয়েছে।' },
  // Profile photo — the tappable avatar in the Settings header. Buttons
  // are surfaced in an Alert-style chooser (same pattern as the delete-
  // contact confirm), so they read as short actions.
  profilePhotoActionTitle: { en: 'Profile photo', bn: 'প্রোফাইল ছবি' },
  takePhotoButton: { en: 'Take Photo', bn: 'ছবি তুলুন' },
  chooseFromLibraryButton: { en: 'Choose from Library', bn: 'লাইব্রেরি থেকে বেছে নিন' },
  removePhotoButton: { en: 'Remove Photo', bn: 'ছবি সরান' },
  removePhotoConfirmTitle: { en: 'Remove profile photo?', bn: 'প্রোফাইল ছবি সরাবেন?' },
  removePhotoConfirmMessage: {
    en: 'Your photo will be deleted. You can add a new one any time.',
    bn: 'আপনার ছবি মুছে ফেলা হবে। আপনি যেকোনো সময় নতুন ছবি যোগ করতে পারেন।',
  },
  photoPermissionDeniedTitle: { en: 'Permission needed', bn: 'অনুমতি প্রয়োজন' },
  photoPermissionDeniedMessage: {
    en: 'Allow SafePath to use your camera and photos in Settings to set a profile photo.',
    bn: 'প্রোফাইল ছবি সেট করতে সেটিংসে গিয়ে SafePath-কে আপনার ক্যামেরা ও ছবি ব্যবহারের অনুমতি দিন।',
  },
  photoUploadFailedMessage: {
    en: "Couldn't update your photo. Please try again.",
    bn: 'আপনার ছবি হালনাগাদ করা যায়নি। আবার চেষ্টা করুন।',
  },
  signOutButton: { en: 'Sign Out', bn: 'সাইন আউট' },
  languageLabel: { en: 'Language', bn: 'ভাষা' },
  languageBn: { en: 'বাংলা', bn: 'বাংলা' },
  languageEn: { en: 'English', bn: 'English' },
  // Row label on the main Settings list + the grouping screen's own
  // title — groups the shake-to-trigger and fake-call toggles below
  // together, since they're conceptually related (both optional in-app
  // safety/escape features).
  safetyFeaturesLink: { en: 'Safety Features', bn: 'নিরাপত্তা বৈশিষ্ট্য' },
  shakeSosToggleLabel: { en: 'Shake to trigger SOS', bn: 'ঝাঁকিয়ে SOS চালু করুন' },
  shakeSosToggleHint: {
    en: 'While the app is open, shaking your phone in a distinct pattern triggers the same SOS alert as the hold button.',
    bn: 'অ্যাপ খোলা অবস্থায়, আপনার ফোন একটি স্বতন্ত্র প্যাটার্নে ঝাঁকালে হোল্ড বাটনের মতোই SOS অ্যালার্ট চালু হবে।',
  },
  fakeCallToggleLabel: { en: 'Fake call escape', bn: 'ভুয়া কল এস্কেপ' },
  fakeCallCallerNameLabel: { en: 'Caller name', bn: 'কলারের নাম' },
  // Guardian-only — see the alarm_sound_enabled migration comment for why
  // this doesn't show for role='user' accounts.
  alarmSoundToggleLabel: {
    en: 'Alarm sound & vibration for alerts',
    bn: 'অ্যালার্টের জন্য শব্দ ও কম্পন',
  },
  alarmSoundToggleHint: {
    en: 'When someone you guard sends an SOS alert, your phone will play a looping alarm sound and vibrate until you acknowledge it. The on-screen flash always shows either way.',
    bn: 'আপনি যাকে নিরাপত্তা দিচ্ছেন তিনি SOS অ্যালার্ট পাঠালে, আপনি স্বীকার না করা পর্যন্ত আপনার ফোনে বারবার অ্যালার্ম শব্দ ও কম্পন হতে থাকবে। স্ক্রিনে ফ্ল্যাশ যেকোনো ক্ষেত্রেই দেখাবে।',
  },
  // Shown when a settings change couldn't be saved; the change is undone.
  settingsLoadRetrying: {
    en: "Couldn't load your settings. Retrying…",
    bn: 'আপনার সেটিংস লোড করা যায়নি। আবার চেষ্টা করা হচ্ছে…',
  },
  settingsProfileMissing: {
    en: "Your account isn't set up correctly. Please contact support.",
    bn: 'আপনার অ্যাকাউন্ট সঠিকভাবে সেট আপ করা হয়নি। অনুগ্রহ করে সাপোর্টের সাথে যোগাযোগ করুন।',
  },
  settingsProfileMissingWithEmail: {
    en: "Your account isn't set up correctly. Please contact support at {email}.",
    bn: 'আপনার অ্যাকাউন্ট সঠিকভাবে সেট আপ করা হয়নি। অনুগ্রহ করে {email} ঠিকানায় সাপোর্টের সাথে যোগাযোগ করুন।',
  },
  emailSupportButton: { en: 'Email support', bn: 'সাপোর্টে ইমেইল করুন' },
  settingSaveFailedTitle: { en: 'Not saved', bn: 'সেভ হয়নি' },
  settingSaveFailedMessage: {
    en: "Couldn't save this setting. Check your internet connection and try again.",
    bn: 'সেটিংটি সেভ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
  },
  // Row label on the main Settings list + the replay screen's own title
  // (components/HelpTutorialScreen.tsx) — replays the same onboarding
  // carousel shown once automatically right after sign-up.
  helpAndTutorialLink: { en: 'Help & Tutorial', bn: 'সাহায্য ও টিউটোরিয়াল' },

  // --- Onboarding carousel (components/OnboardingCarousel.tsx +
  // OnboardingScreen.tsx) — shown once automatically right after a
  // first-time sign-up (see lib/onboarding-storage.ts), and replayable
  // on demand from Settings via helpAndTutorialLink above. ---
  onboardingSkipButton: { en: 'Skip', bn: 'এড়িয়ে যান' },
  onboardingNextButton: { en: 'Next', bn: 'পরবর্তী' },
  onboardingLaterButton: { en: 'I will do this later', bn: 'পরে করব' },
  onboardingStepCount: { en: '{n} of {total}', bn: '{total}টির মধ্যে {n}' },
  // Student / working woman (the persona saved on this device picks the
  // first slide; without one the neutral welcome is shown)
  onboardingStudentIntroTitle: {
    en: 'Safer trips to campus and back',
    bn: 'ক্যাম্পাসে যাওয়া-আসা আরও নিরাপদ',
  },
  onboardingStudentIntroBody: {
    en: 'For classes, coaching and the commute home. The people you trust can find you in one tap.',
    bn: 'ক্লাস, কোচিং আর বাড়ি ফেরার পথে। এক ট্যাপেই আপনার বিশ্বস্ত মানুষেরা আপনাকে খুঁজে পাবেন।',
  },
  onboardingWorkingIntroTitle: {
    en: 'Safer late shifts and rides home',
    bn: 'দেরির শিফট আর বাড়ি ফেরা আরও নিরাপদ',
  },
  onboardingWorkingIntroBody: {
    en: 'For late shifts, rides and travel for work. The people you trust can find you in one tap.',
    bn: 'দেরির শিফট, রাইড আর কাজের যাতায়াতে। এক ট্যাপেই আপনার বিশ্বস্ত মানুষেরা আপনাকে খুঁজে পাবেন।',
  },
  onboardingUserWelcomeTitle: { en: 'Welcome to SafePath', bn: 'সেফপাথে স্বাগতম' },
  onboardingUserWelcomeBody: {
    en: 'SafePath helps you stay safe and keeps the people you trust close by — with one tap in an emergency.',
    bn: 'সেফপাথ আপনাকে নিরাপদ রাখতে সাহায্য করে এবং আপনার বিশ্বাসের মানুষদের কাছাকাছি রাখে — জরুরি অবস্থায় একটি ট্যাপেই।',
  },
  onboardingSosJourneyTitle: { en: 'SOS and journey check-ins', bn: 'SOS আর যাত্রা চেক-ইন' },
  onboardingSosJourneyBody: {
    en: "Hold SOS for 2 seconds to alert your guardians with your location. Before heading out, start a journey: if you don't check in on time, they are told automatically.",
    bn: 'আপনার অবস্থানসহ অভিভাবকদের সতর্ক করতে SOS ২ সেকেন্ড ধরে রাখুন। বের হওয়ার আগে একটি যাত্রা শুরু করুন: সময়মতো চেক-ইন না করলে তাদের স্বয়ংক্রিয়ভাবে জানানো হবে।',
  },
  onboardingContactsTitle: {
    en: 'Add your guardian and emergency contacts',
    bn: 'আপনার অভিভাবক ও জরুরি যোগাযোগ যুক্ত করুন',
  },
  onboardingGuardiansRowTitle: {
    en: 'Guardians use SafePath',
    bn: 'অভিভাবকেরা সেফপাথ ব্যবহার করেন',
  },
  onboardingGuardiansRowHint: {
    en: 'They get your SOS and journey check-ins in the app',
    bn: 'তারা অ্যাপে আপনার SOS আর যাত্রা চেক-ইনের খবর পান',
  },
  onboardingContactsRowTitle: {
    en: 'Emergency contacts: any phone',
    bn: 'জরুরি যোগাযোগ: যেকোনো ফোন',
  },
  onboardingContactsRowHint: {
    en: 'They get an SMS if you send SOS without internet',
    bn: 'ইন্টারনেট ছাড়া SOS পাঠালে তারা এসএমএস পান',
  },
  onboardingAddGuardianButton: { en: 'Add a guardian', bn: 'অভিভাবক যোগ করুন' },
  onboardingAddContactsButton: {
    en: 'Add emergency contacts',
    bn: 'জরুরি যোগাযোগ যোগ করুন',
  },
  // Guardian
  onboardingGuardianWelcomeTitle: { en: 'Welcome, Guardian', bn: 'স্বাগতম, অভিভাবক' },
  onboardingGuardianWelcomeBody: {
    en: "As a guardian, you'll be the first to know if someone you care about needs help.",
    bn: 'একজন অভিভাবক হিসেবে, আপনি যাকে নিয়ে চিন্তিত তার সাহায্য দরকার হলে আপনিই প্রথম জানবেন।',
  },
  onboardingGuardianAlertsTitle: { en: 'Active Alerts', bn: 'সক্রিয় অ্যালার্ট' },
  onboardingGuardianAlertsBody: {
    en: "You'll see alerts live here and get an email too, so you don't need to keep the app open all the time.",
    bn: 'আপনি এখানে সরাসরি অ্যালার্ট দেখতে পাবেন এবং একটি ইমেইলও পাবেন, তাই সবসময় অ্যাপ খোলা রাখার দরকার নেই।',
  },
  onboardingGuardianLinkTitle: {
    en: 'Link your children or family members',
    bn: 'আপনার সন্তান বা পরিবারের সদস্যদের যুক্ত করুন',
  },
  onboardingGuardianStep1Title: { en: 'Create an invite code', bn: 'একটি আমন্ত্রণ কোড তৈরি করুন' },
  onboardingGuardianStep1Hint: {
    en: 'Tap Invite and share the code with them',
    bn: '"আমন্ত্রণ"-এ ট্যাপ করে কোডটি তাদের পাঠান',
  },
  onboardingGuardianStep2Title: {
    en: 'They enter it and accept',
    bn: 'তারা কোডটি লিখে গ্রহণ করেন',
  },
  onboardingGuardianStep2Hint: {
    en: 'In SafePath › Guardians. Each code works once, within 24 hours',
    bn: 'সেফপাথ › অভিভাবক-এ। প্রতিটি কোড ২৪ ঘণ্টার মধ্যে একবারই কাজ করে',
  },
  onboardingGuardianStep3Title: { en: 'You are linked', bn: 'আপনারা যুক্ত হয়ে গেলেন' },
  onboardingGuardianStep3Hint: {
    en: 'You get their SOS alerts and missed check-ins',
    bn: 'আপনি তাদের SOS অ্যালার্ট আর মিস হওয়া চেক-ইনের খবর পাবেন',
  },
  onboardingGuardianLocationNote: {
    en: 'You see their location only when they share it: during SOS, a journey, live sharing, or history they turn on.',
    bn: 'তারা শেয়ার করলেই শুধু আপনি তাদের অবস্থান দেখতে পান: SOS, যাত্রা, লাইভ শেয়ারিং বা তাদের চালু করা হিস্ট্রির সময়।',
  },
  onboardingCreateCodeButton: { en: 'Create invite code', bn: 'আমন্ত্রণ কোড তৈরি করুন' },

  // --- Emergency contacts screen ---
  emergencyContactsTitle: { en: 'Emergency Contacts', bn: 'জরুরি যোগাযোগ' },
  emergencyContactsSubtitle: {
    en: "Used to send an SMS for help if you're offline when you trigger SOS.",
    bn: 'আপনি SOS চালু করার সময় অফলাইনে থাকলে সাহায্যের জন্য এসএমএস পাঠাতে ব্যবহৃত হয়।',
  },
  addContactButton: { en: 'Add Contact', bn: 'যোগাযোগ যোগ করুন' },
  namePlaceholder: { en: 'Name', bn: 'নাম' },
  enterContactName: { en: "Enter the contact's name.", bn: 'যোগাযোগের নাম লিখুন।' },
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
  guardianHomeEyebrow: { en: 'Guardian', bn: 'অভিভাবক' },
  guardianHomeTitle: { en: 'Your family', bn: 'আপনার পরিবার' },
  guardianHomeInviteButton: { en: 'Invite', bn: 'আমন্ত্রণ' },
  tapToSilenceAlarmHint: {
    en: 'Tap anywhere to silence — the alert stays until marked resolved',
    bn: 'নিঃশব্দ করতে যেকোনো জায়গায় ট্যাপ করুন — সমাধান হিসেবে চিহ্নিত না করা পর্যন্ত অ্যালার্ট থাকবে',
  },
  guardianPastAlertsTitle: { en: 'Past Alerts', bn: 'পূর্ববর্তী অ্যালার্ট' },

  // --- Guardian: invite a family member ---
  guardianInviteTitle: { en: 'Invite a family member', bn: 'পরিবারের একজনকে আমন্ত্রণ জানান' },
  guardianInviteIntro: {
    en: 'Create a code and share it with your family member. They enter it in SafePath and choose whether to accept.',
    bn: 'একটি কোড তৈরি করে পরিবারের সদস্যকে পাঠান। তারা সেফপাথে কোডটি লিখে ঠিক করবেন গ্রহণ করবেন কি না।',
  },
  createInviteCodeButton: { en: 'Create invite code', bn: 'আমন্ত্রণ কোড তৈরি করুন' },
  creatingInviteCode: { en: 'Creating…', bn: 'তৈরি করা হচ্ছে…' },
  createAnotherCodeButton: { en: 'Create another code', bn: 'আরেকটি কোড তৈরি করুন' },
  guardianCodeHint: {
    en: 'Works once · expires {time}',
    bn: 'একবারই কাজ করে · মেয়াদ শেষ {time}',
  },
  guardianHowItWorksBody: {
    en: 'Your family member opens SafePath › Guardians and enters this code. They see your name and choose to accept or decline. You are linked only after they accept.',
    bn: 'আপনার পরিবারের সদস্য সেফপাথ › অভিভাবক খুলে এই কোডটি লিখবেন। তারা আপনার নাম দেখে গ্রহণ বা প্রত্যাখ্যান করবেন। তারা গ্রহণ করলেই কেবল আপনারা যুক্ত হবেন।',
  },
  // A declined request stays "waiting" until it expires, and every
  // inactive code reads the same, so a decline is never given away.
  waitingCodesLabel: { en: 'Waiting to accept', bn: 'গ্রহণের অপেক্ষায়' },
  waitingCodeMeta: { en: 'Created {time}', bn: 'তৈরি {time}' },
  inactiveCodesLabel: { en: 'Recent codes', bn: 'সাম্প্রতিক কোড' },
  inactiveCodeMeta: { en: '{code} · Code no longer active', bn: '{code} · কোডটি আর সক্রিয় নেই' },
  tooManyWaitingCodes: {
    en: 'You can have 3 codes waiting at once. Cancel one to create another.',
    bn: 'একসাথে ৩টি কোড অপেক্ষায় রাখা যায়। আরেকটি তৈরি করতে একটি বাতিল করুন।',
  },
  dailyCodeLimit: {
    en: "You've created 10 codes in the last 24 hours. Try again later.",
    bn: 'গত ২৪ ঘণ্টায় আপনি ১০টি কোড তৈরি করেছেন। পরে আবার চেষ্টা করুন।',
  },
  inviteListLoadFailed: {
    en: "Couldn't load your codes. Check your connection and open this screen again.",
    bn: 'আপনার কোডগুলো লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে এই পাতাটি আবার খুলুন।',
  },
  guardianShareCodeMessage: {
    en: "I'd like to be your guardian on SafePath. Open SafePath › Guardians, tap Have an invite code? and enter {code}. It works once, within 24 hours.",
    bn: 'আমি সেফপাথে আপনার অভিভাবক হতে চাই। সেফপাথ › অভিভাবক খুলে "আমন্ত্রণ কোড আছে?"-এ এই কোডটি লিখুন: {code}। কোডটি ২৪ ঘণ্টার মধ্যে একবারই কাজ করে।',
  },
  // Older-app entry: a family member on 1.1/1.2 still creates the code.
  olderAppCodeToggle: {
    en: 'Have a code from an older SafePath?',
    bn: 'সেফপাথের পুরোনো ভার্সনের কোড আছে?',
  },
  olderAppCodeHint: {
    en: "If your family member's app gave them a code to send you, enter it here. You're linked as soon as you enter it.",
    bn: 'পরিবারের সদস্যের অ্যাপ যদি আপনাকে পাঠানোর জন্য একটি কোড দিয়ে থাকে, তা এখানে লিখুন। লেখার সাথে সাথেই আপনারা যুক্ত হয়ে যাবেন।',
  },

  sosAlertTypeLabel: { en: 'SOS', bn: 'SOS' },
  missedCheckinTypeLabel: { en: 'Missed Check-in', bn: 'চেক-ইন মিস হয়েছে' },
  guardianAlertNeedsHelp: { en: '{name} needs help', bn: '{name}-এর সাহায্য দরকার' },
  guardianAlertMissedCheckin: {
    en: '{name} missed a check-in',
    bn: '{name} চেক-ইন মিস করেছেন',
  },

  // --- Guardian: live location sharing ---
  // Only shown while a linked person is actively sharing. A card
  // disappears the moment they stop (Realtime), so a guardian never sees a
  // stale position without it being labelled current.
  guardianLiveLocationTitle: { en: 'Live location', bn: 'লাইভ লোকেশন' },
  guardianLiveLocationLoadError: {
    en: "Couldn't load live locations. Tap to retry.",
    bn: 'লাইভ লোকেশন লোড করা যায়নি। আবার চেষ্টা করতে ট্যাপ করুন।',
  },
  guardianLiveLocationEmpty: {
    en: 'No one is sharing their live location right now.',
    bn: 'এই মুহূর্তে কেউ লাইভ লোকেশন শেয়ার করছেন না।',
  },
  guardianLiveLocationBadge: { en: 'SHARING LIVE', bn: 'লাইভ শেয়ারিং' },
  guardianLiveLocationWaiting: {
    en: 'Waiting for the first location…',
    bn: 'প্রথম অবস্থানের জন্য অপেক্ষা করা হচ্ছে…',
  },
  guardianLiveLocationUpdated: { en: 'Updated {ago}', bn: '{ago} আপডেট হয়েছে' },
  guardianLiveLocationStaleBadge: { en: 'NOT UPDATING', bn: 'আপডেট হচ্ছে না' },
  guardianLiveLocationStale: {
    en: "No update for {ago} — the phone may be offline. This isn't their current position.",
    bn: '{ago} ধরে কোনো আপডেট নেই — ফোনটি অফলাইন থাকতে পারে। এটি তাদের বর্তমান অবস্থান নয়।',
  },
  viewOnMapLink: { en: 'View on map', bn: 'ম্যাপে দেখুন' },

  // --- Guardian: recorded live location (its own tab, between "Invite"
  // and "Settings") ---
  guardianLocationHistoryTitle: { en: 'Recorded Location', bn: 'রেকর্ড করা অবস্থান' },
  guardianLocationHistorySubtitle: {
    en: 'The saved location trail for each person you support who has recording turned on.',
    bn: 'আপনি যাদের সহায়তা করেন এবং যাদের রেকর্ডিং চালু আছে, তাদের প্রত্যেকের সংরক্ষিত অবস্থানের পথ।',
  },
  guardianLocationHistoryNoLinks: {
    en: "You're not linked to anyone yet.",
    bn: 'আপনি এখনো কারো সাথে যুক্ত নন।',
  },
  guardianLocationHistoryRecordingOn: { en: 'Recording on', bn: 'রেকর্ডিং চালু' },
  guardianLocationHistoryRecordingOff: { en: 'Recording off', bn: 'রেকর্ডিং বন্ধ' },
  guardianLocationHistoryNoPoints: {
    en: 'No recorded points in the last {window}.',
    bn: 'গত {window} সময়ে কোনো রেকর্ড করা অবস্থান নেই।',
  },
  guardianLocationHistoryPointCount: {
    en: '{n} points in the last {window}',
    bn: 'গত {window} সময়ে {n}টি অবস্থান',
  },
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
  inviteCodeLabel: { en: 'Invite code', bn: 'আমন্ত্রণ কোড' },
  enterInviteCode: { en: 'Enter an invite code.', bn: 'একটি আমন্ত্রণ কোড লিখুন।' },
  invalidOrUsedCode: {
    en: 'That invite code is invalid, expired or already used. Ask for a new code.',
    bn: 'এই আমন্ত্রণ কোডটি সঠিক নয়, মেয়াদোত্তীর্ণ অথবা ইতিমধ্যে ব্যবহৃত। একটি নতুন কোড চেয়ে নিন।',
  },
  alreadyLinkedCode: {
    en: "You're already linked to this person, so this code wasn't used.",
    bn: 'আপনি ইতিমধ্যে এই ব্যক্তির সাথে যুক্ত আছেন, তাই এই কোডটি ব্যবহার করা হয়নি।',
  },
  sessionExpired: {
    en: 'Your session may have expired. Try signing in again.',
    bn: 'আপনার সেশনের মেয়াদ শেষ হয়ে থাকতে পারে। আবার সাইন ইন করার চেষ্টা করুন।',
  },
  nowLinkedTo: { en: "You're now linked to {name}.", bn: 'আপনি এখন {name}-এর সাথে যুক্ত।' },
  thisUserFallback: { en: 'this user', bn: 'এই ব্যবহারকারী' },
  linkButton: { en: 'Link', bn: 'যুক্ত করুন' },
  linkingButton: { en: 'Linking…', bn: 'যুক্ত করা হচ্ছে…' },

  // --- Not found (app/+not-found.tsx) ---
  notFoundTitle: { en: 'Oops!', bn: 'ওহো!' },
  notFoundMessage: { en: "This screen doesn't exist.", bn: 'এই স্ক্রিনটি নেই।' },
  goToHomeLink: { en: 'Go to home screen', bn: 'হোম স্ক্রিনে যান' },

  // --- App updates (components/AppUpdatePrompts.tsx) ---
  updateReadyTitle: { en: 'A new update is ready', bn: 'নতুন আপডেট এসেছে' },
  updateReadyMessage: {
    en: 'Restart SafePath to start using it. It takes a few seconds.',
    bn: 'ব্যবহার শুরু করতে SafePath আবার চালু করুন। কয়েক সেকেন্ড লাগবে।',
  },
  updateRestartNow: { en: 'Restart now', bn: 'এখনই রিস্টার্ট করুন' },
  updateLater: { en: 'Later', bn: 'পরে' },
  whatsNewTitle: { en: "What's new", bn: 'নতুন যা আছে' },
  whatsNewOk: { en: 'OK', bn: 'ঠিক আছে' },
  appVersionLabel: { en: 'Version {version}', bn: 'সংস্করণ {version}' },
} as const satisfies Record<string, Entry>;

export type TranslationKey = keyof typeof translations;

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

// For numbers built at runtime; Bangla strings write their own digits in
// Bengali, so a count dropped into one should match.
export function localizeDigits(value: number, language: Language): string {
  const text = String(value);
  return language === 'bn' ? text.replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]) : text;
}

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
