import AsyncStorage from '@react-native-async-storage/async-storage';

import { PERSONAS, type Persona } from '@/lib/personas';

const KEY_PREFIX = 'safepath:pendingOnboarding:';
const PERSONA_KEY_PREFIX = 'safepath:persona:';

// Marked right after a successful sign-up (see app/(auth)/sign-up.tsx),
// keyed by the new account's user id — NOT an in-memory flag, because
// this project requires email confirmation (see
// 20260828091441_phone_survives_email_confirmation.sql's own notes on
// why), so "immediately after sign-up" almost always means a separate
// later sign-in, not the same request/session. AsyncStorage survives
// that gap; an in-memory flag wouldn't reliably.
//
// The persona picked on the welcome screen is saved alongside it, on this
// device only: it picks the onboarding wording and is never sent to the
// database. It is kept after onboarding so Settings' tutorial replay uses
// the same wording; a different device has none and gets the neutral copy.
//
// Consumed (read once, then cleared) by the role-appropriate landing
// screen on its first mount for that user — see lib/use-pending-
// onboarding.ts. Best-effort throughout: a storage failure here should
// never be able to block sign-up or block someone from using the app,
// only (worst case) mean they don't see the onboarding carousel once.
export async function markOnboardingPending(userId: string, persona: Persona): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [KEY_PREFIX + userId, '1'],
      [PERSONA_KEY_PREFIX + userId, persona],
    ]);
  } catch {
    // Best-effort — see comment above.
  }
}

export async function consumeOnboardingPending(userId: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(KEY_PREFIX + userId);
    if (value === null) return false;
    await AsyncStorage.removeItem(KEY_PREFIX + userId);
    return true;
  } catch {
    return false;
  }
}

export async function loadDevicePersona(userId: string): Promise<Persona | null> {
  try {
    const value = await AsyncStorage.getItem(PERSONA_KEY_PREFIX + userId);
    return PERSONAS.find((persona) => persona === value) ?? null;
  } catch {
    return null;
  }
}
