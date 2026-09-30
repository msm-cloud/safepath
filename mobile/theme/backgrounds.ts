import type { ImageSource } from 'expo-image';

// Background photos are only for calm, low-stakes screens. SOS, alerts,
// maps, lists and settings must stay on plain surfaces so nothing competes
// with the information on them; keeping this union closed makes that a
// type error rather than a review comment.
export type ScreenBackground = 'welcome' | 'auth' | 'onboarding' | 'empty';

// Every file here must have a matching row in
// assets/backgrounds/CREDITS.md. Until a photo is added, the screen shows
// the dark fallback colour under the same overlay.
export const backgroundSources: Record<ScreenBackground, ImageSource | null> = {
  welcome: null,
  auth: null,
  onboarding: null,
  empty: null,
};
