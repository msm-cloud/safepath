import { useRouter } from 'expo-router';

import OnboardingScreen from '@/components/OnboardingScreen';
import { useAuth } from '@/lib/auth-context';

// Shared between the student ((tabs)/tutorial.tsx) and guardian
// ((guardian)/tutorial.tsx) tab groups, same href: null pattern as
// ChangePasswordScreen.tsx — reachable from Settings' "Help & Tutorial"
// row at any time, replaying the exact same carousel (same component,
// same content) shown once automatically right after sign-up.
//
// Unlike the sign-up case, there's a real screen to go back to here —
// finishing (or skipping) just returns to Settings rather than
// navigating to the role's landing screen.
export default function HelpTutorialScreen() {
  const { role } = useAuth();
  const router = useRouter();

  // Defensive — this screen is only reachable from within an
  // already-role-gated tab group, so role should always be known by the
  // time someone can navigate here.
  if (!role) return null;

  return <OnboardingScreen role={role} onFinish={() => router.back()} />;
}
