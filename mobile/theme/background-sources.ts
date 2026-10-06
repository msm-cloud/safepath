import type { ImageSource } from 'expo-image';

import {
  backgroundPhotoSpecs,
  type BackgroundPhotoSpec,
  type ScreenBackground,
} from './backgrounds';

export type BackgroundPhoto = BackgroundPhotoSpec & { source: ImageSource };

// Metro only bundles files named in a literal require(), so each photo in
// backgroundPhotoSpecs needs its line here as well.
const SOURCES: Partial<Record<ScreenBackground, ImageSource>> = {
  welcome: require('@/assets/backgrounds/welcome.webp'),
  auth: require('@/assets/backgrounds/auth.webp'),
  onboardingStudent: require('@/assets/backgrounds/onboarding-student.webp'),
  onboardingWorking: require('@/assets/backgrounds/onboarding-working.webp'),
  onboardingGuardian: require('@/assets/backgrounds/onboarding-guardian.webp'),
};

export function backgroundPhoto(background: ScreenBackground): BackgroundPhoto | null {
  const spec = backgroundPhotoSpecs[background];
  const source = SOURCES[background];
  return spec && source ? { ...spec, source } : null;
}
