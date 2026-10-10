// Background photos are only for calm, low-stakes screens. SOS, alerts,
// maps, lists and settings must stay on plain surfaces so nothing competes
// with the information on them; keeping this union closed makes that a
// type error rather than a review comment.
// Onboarding has one photo per persona (see components/OnboardingScreen.tsx).
export type ScreenBackground =
  'welcome' | 'auth' | 'onboardingStudent' | 'onboardingWorking' | 'onboardingGuardian';

// The `overlay` colour token uses the lower bound. A brighter photo can ask
// for a darker overlay, chosen so every text pair on it passes WCAG AA;
// values outside the range are clamped.
export const OVERLAY_OPACITY_RANGE = { min: 0.55, max: 0.65 } as const;

export type BackgroundPhotoSpec = {
  // File name in mobile/assets/backgrounds/.
  file: string;
  overlayOpacity: number;
};

export function clampOverlayOpacity(value: number): number {
  return Math.min(OVERLAY_OPACITY_RANGE.max, Math.max(OVERLAY_OPACITY_RANGE.min, value));
}

// Every file here must have a matching row in
// assets/backgrounds/CREDITS.md, and `pnpm check:contrast` measures each one
// at its overlay. Until a photo is added, the screen shows the dark fallback
// colour under the default overlay.
//
// Kept free of require() so the contrast script can import it under Node;
// the image sources live in background-sources.ts.
export const backgroundPhotoSpecs: Record<ScreenBackground, BackgroundPhotoSpec | null> = {
  welcome: { file: 'welcome.webp', overlayOpacity: 0.58 },
  auth: { file: 'auth.webp', overlayOpacity: 0.58 },
  onboardingStudent: { file: 'onboarding-student.webp', overlayOpacity: 0.55 },
  onboardingWorking: { file: 'onboarding-working.webp', overlayOpacity: 0.58 },
  onboardingGuardian: { file: 'onboarding-guardian.webp', overlayOpacity: 0.55 },
};

// Drawn over the flat overlay. It darkens the top behind the status bar and
// the bottom half, where buttons and small print sit, so those stay readable
// wherever the cover crop lands on a given screen. It only ever adds
// darkness, so the contrast check measures the flat overlay alone.
export const PHOTO_GRADIENT =
  'linear-gradient(to bottom, rgba(17,19,31,0.35) 0%, rgba(17,19,31,0) 18%, ' +
  'rgba(17,19,31,0) 50%, rgba(17,19,31,0.5) 100%)';
