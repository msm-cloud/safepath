import type { ImageSource } from 'expo-image';

// Background photos are only for calm, low-stakes screens. SOS, alerts,
// maps, lists and settings must stay on plain surfaces so nothing competes
// with the information on them; keeping this union closed makes that a
// type error rather than a review comment.
export type ScreenBackground = 'welcome' | 'auth' | 'onboarding' | 'empty';

// The `overlay` colour token uses the lower bound. A brighter photo can ask
// for a darker overlay, chosen so every text pair on it passes WCAG AA;
// values outside the range are clamped.
export const OVERLAY_OPACITY_RANGE = { min: 0.55, max: 0.65 } as const;

export type BackgroundPhoto = {
  source: ImageSource;
  overlayOpacity?: number;
};

export function clampOverlayOpacity(value: number): number {
  return Math.min(OVERLAY_OPACITY_RANGE.max, Math.max(OVERLAY_OPACITY_RANGE.min, value));
}

// Every file here must have a matching row in
// assets/backgrounds/CREDITS.md. Until a photo is added, the screen shows
// the dark fallback colour under the default overlay.
export const backgroundPhotos: Record<ScreenBackground, BackgroundPhoto | null> = {
  welcome: null,
  auth: null,
  onboarding: null,
  empty: null,
};
