import { Stack } from 'expo-router';

import { useLanguage } from '@/lib/language-context';

export default function AuthLayout() {
  const { t } = useLanguage();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* Reuses signInButton/signUpButton — the same short "Sign In"/"Sign
          Up" strings already translated for the buttons on this screen
          and on the welcome screen, rather than adding near-duplicate
          keys just for the header bar. */}
      <Stack.Screen name="sign-in" options={{ title: t('signInButton') }} />
      <Stack.Screen name="sign-up" options={{ title: t('signUpButton') }} />
    </Stack>
  );
}
