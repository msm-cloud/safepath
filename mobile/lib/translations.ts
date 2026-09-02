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
  // Sign-in accepts either an email or a phone number (see
  // lib/resolve-login-identifier.ts) — sign-up still asks for email and
  // phone as two separate required fields, so emailPlaceholder above is
  // still used there unchanged.
  emailOrPhonePlaceholder: { en: 'Email or Phone Number', bn: 'ইমেইল অথবা ফোন নম্বর' },
  invalidEmailOrPhone: {
    en: 'Enter a valid email address or phone number.',
    bn: 'একটি সঠিক ইমেইল ঠিকানা অথবা ফোন নম্বর লিখুন।',
  },
  passwordPlaceholder: { en: 'Password', bn: 'পাসওয়ার্ড' },
  signInButton: { en: 'Sign In', bn: 'সাইন ইন' },
  signUpLink: { en: "Don't have an account? Sign up", bn: 'অ্যাকাউন্ট নেই? সাইন আপ করুন' },
  invalidEmail: { en: 'Enter a valid email address.', bn: 'একটি সঠিক ইমেইল ঠিকানা লিখুন।' },
  passwordTooShort: {
    en: 'Password must be at least {n} characters.',
    bn: 'পাসওয়ার্ড কমপক্ষে {n} অক্ষরের হতে হবে।',
  },
  showPasswordLabel: { en: 'Show password', bn: 'পাসওয়ার্ড দেখান' },
  hidePasswordLabel: { en: 'Hide password', bn: 'পাসওয়ার্ড লুকান' },
  // Same fixed string Supabase's own API returns for a wrong password
  // (error.code === 'invalid_credentials') — used verbatim (not passed
  // through from the API) for BOTH that case and an unresolved email/
  // phone identifier, so the two are guaranteed byte-identical rather
  // than just coincidentally the same today. That's what actually makes
  // this un-enumerable — see sign-in.tsx.
  invalidCredentials: { en: 'Invalid login credentials', bn: 'সাইন ইন তথ্য সঠিক নয়।' },
  forgotPasswordLink: { en: 'Forgot Password?', bn: 'পাসওয়ার্ড ভুলে গেছেন?' },
  userManualLink: { en: 'Need help? View the user guide', bn: 'সাহায্য দরকার? ব্যবহার নির্দেশিকা দেখুন' },

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
  duplicatePhoneError: {
    en: 'That phone number is already registered to another account.',
    bn: 'এই ফোন নম্বরটি ইতিমধ্যে অন্য একটি অ্যাকাউন্টে নিবন্ধিত।',
  },

  // --- Forgot / reset password ---
  forgotPasswordTitle: { en: 'Reset your password', bn: 'আপনার পাসওয়ার্ড পুনরায় সেট করুন' },
  forgotPasswordSubtitle: {
    en: "Enter the email or phone number on your account, and we'll send you a link to reset your password.",
    bn: 'আপনার অ্যাকাউন্টের ইমেইল অথবা ফোন নম্বর লিখুন, আমরা আপনাকে পাসওয়ার্ড পুনরায় সেট করার একটি লিংক পাঠাবো।',
  },
  sendResetLinkButton: { en: 'Send Reset Link', bn: 'রিসেট লিংক পাঠান' },
  sendingResetLinkButton: { en: 'Sending…', bn: 'পাঠানো হচ্ছে…' },
  // Shown identically whether or not the identifier actually resolved to
  // an account — see forgot-password.tsx. Never reveal which is true.
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

  // --- Change password (already signed in — distinct from forgot/reset
  // above, which is for someone who ISN'T signed in and doesn't know
  // their password at all). Reused for the Settings link, the screen's
  // header title, and the submit button — same short-string-reuse
  // convention as signInButton/signUpButton already documented in
  // app/(auth)/_layout.tsx. ---
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

  // --- Fake call escape (Home screen) ---
  fakeCallButton: { en: 'Fake Call', bn: 'ভুয়া কল' },
  fakeCallDelayPickerTitle: { en: 'When should it ring?', bn: 'কখন কল আসবে?' },
  fakeCallDelayNow: { en: 'Now', bn: 'এখনই' },
  fakeCallDelaySeconds: { en: '{n} seconds', bn: '{n} সেকেন্ড' },
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

  // --- Shake-to-trigger SOS ---
  shakeDetectedTitle: { en: 'Shake detected', bn: 'ঝাঁকুনি শনাক্ত হয়েছে' },
  shakeCountdownMessage: { en: 'Sending SOS in {n}...', bn: '{n}-এ SOS পাঠানো হচ্ছে...' },
  tapAnywhereToCancelHint: {
    en: 'Tap anywhere to cancel',
    bn: 'বাতিল করতে যেকোনো জায়গায় ট্যাপ করুন',
  },

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
  // Role badge (components/RoleBadge.tsx) — shown at the top of the first
  // post-sign-in screen (Home for students, Active Alerts for guardians)
  // and again in Settings next to signedInAs above. Distinct from
  // guardianSignInHeading/studentSignInHeading, which are pre-auth
  // framing text on the sign-in form, not a persistent indicator.
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
  fakeCallDefaultCallerName: { en: 'Mom', bn: 'আম্মু' },
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
  onboardingGetStartedButton: { en: 'Get Started', bn: 'শুরু করুন' },
  // Student
  onboardingStudentWelcomeTitle: { en: 'Welcome to SafePath', bn: 'সেফপাথে স্বাগতম' },
  onboardingStudentWelcomeBody: {
    en: 'SafePath helps you stay safe and keeps the people you trust close by — with one tap in an emergency.',
    bn: 'সেফপাথ আপনাকে নিরাপদ রাখতে সাহায্য করে এবং আপনার বিশ্বাসের মানুষদের কাছাকাছি রাখে — জরুরি অবস্থায় একটি ট্যাপেই।',
  },
  onboardingStudentSosTitle: { en: 'Hold for SOS', bn: 'SOS-এর জন্য ধরে রাখুন' },
  onboardingStudentSosBody: {
    en: 'Hold the SOS button for 2 seconds to instantly alert your guardian with your location.',
    bn: 'আপনার অবস্থানসহ তাৎক্ষণিকভাবে আপনার অভিভাবককে সতর্ক করতে SOS বাটনটি ২ সেকেন্ড ধরে রাখুন।',
  },
  onboardingStudentGuardianTitle: { en: 'Add a Guardian', bn: 'একজন অভিভাবক যোগ করুন' },
  onboardingStudentGuardianBody: {
    en: "Invite someone you trust as a guardian, so they're notified the moment you need help.",
    bn: 'আপনার বিশ্বাসের কাউকে অভিভাবক হিসেবে আমন্ত্রণ জানান, যাতে আপনার সাহায্য দরকার হলে তারা সাথে সাথে জানতে পারেন।',
  },
  onboardingStudentContactsTitle: { en: 'Emergency Contacts', bn: 'জরুরি যোগাযোগ' },
  onboardingStudentContactsBody: {
    en: 'Add emergency contacts so an offline SOS can still reach someone by text, even with no internet.',
    bn: 'জরুরি যোগাযোগ যোগ করুন, যাতে ইন্টারনেট না থাকলেও অফলাইন SOS এসএমএসের মাধ্যমে কারো কাছে পৌঁছাতে পারে।',
  },
  onboardingStudentJourneyTitle: { en: 'Journey Check-ins', bn: 'যাত্রা চেক-ইন' },
  onboardingStudentJourneyBody: {
    en: "Optional: start a journey before heading out, and your guardian is notified automatically if you don't check in safely.",
    bn: 'ঐচ্ছিক: বের হওয়ার আগে একটি যাত্রা শুরু করুন, আপনি নিরাপদে চেক-ইন না করলে আপনার অভিভাবক স্বয়ংক্রিয়ভাবে জানতে পারবেন।',
  },
  // Guardian
  onboardingGuardianWelcomeTitle: { en: 'Welcome, Guardian', bn: 'স্বাগতম, অভিভাবক' },
  onboardingGuardianWelcomeBody: {
    en: "As a guardian, you'll be the first to know if someone you care about needs help.",
    bn: 'একজন অভিভাবক হিসেবে, আপনি যাকে নিয়ে চিন্তিত তার সাহায্য দরকার হলে আপনিই প্রথম জানবেন।',
  },
  onboardingGuardianLinkTitle: { en: 'Link to Someone', bn: 'কারো সাথে যুক্ত হন' },
  onboardingGuardianLinkBody: {
    en: 'Ask the person you support for their invite code, then enter it here to connect your accounts.',
    bn: 'যাকে আপনি সহায়তা করছেন তার কাছ থেকে আমন্ত্রণ কোড চান, তারপর আপনার অ্যাকাউন্ট যুক্ত করতে এখানে সেটি লিখুন।',
  },
  onboardingGuardianAlertsTitle: { en: 'Active Alerts', bn: 'সক্রিয় অ্যালার্ট' },
  onboardingGuardianAlertsBody: {
    en: "You'll see alerts live here and get an email too, so you don't need to keep the app open all the time.",
    bn: 'আপনি এখানে সরাসরি অ্যালার্ট দেখতে পাবেন এবং একটি ইমেইলও পাবেন, তাই সবসময় অ্যাপ খোলা রাখার দরকার নেই।',
  },

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

  // --- Guardian: live location sharing ---
  // Only shown while a linked person is actively sharing. A card
  // disappears the moment they stop (Realtime), so a guardian never sees a
  // stale position without it being labelled current.
  guardianLiveLocationTitle: { en: 'Live location', bn: 'লাইভ লোকেশন' },
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

  // --- Not found (app/+not-found.tsx) ---
  notFoundTitle: { en: 'Oops!', bn: 'ওহো!' },
  notFoundMessage: { en: "This screen doesn't exist.", bn: 'এই স্ক্রিনটি নেই।' },
  goToHomeLink: { en: 'Go to home screen!', bn: 'হোম স্ক্রিনে যান!' },
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
