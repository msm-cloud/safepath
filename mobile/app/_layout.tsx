import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import ShakeSosListener from '@/components/ShakeSosListener';
import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { LanguageProvider } from '@/lib/language-context';
import { UserSettingsProvider } from '@/lib/user-settings-context';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding until we know whether there's
// an existing session — otherwise the app would flash the wrong stack
// (tabs vs. sign-in) before Stack.Protected below can redirect.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <UserSettingsProvider>
        <LanguageProvider>
          <RootLayoutNav />
        </LanguageProvider>
      </UserSettingsProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Existing student experience — completely unchanged. */}
        <Stack.Protected guard={!!session && role === 'user'}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* New parallel guardian experience — see app/(guardian)/. */}
        <Stack.Protected guard={!!session && role === 'guardian'}>
          <Stack.Screen name="(guardian)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Deliberately NOT inside any Stack.Protected block — see
            reset-password.tsx's own top-of-file comment for why: the
            recovery link's tokens get exchanged for a real session while
            this screen is showing, and a guard here would immediately
            navigate away before the person can set a new password. */}
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      </Stack>

      {/* Mounted once, app-wide, alongside the Stack rather than inside any
          one screen — active on every authenticated screen (any role, any
          tab), not just the SOS tab. No-ops entirely (no sensor
          subscription at all) while signed out or while the Settings
          toggle is off — see its own comments. */}
      <ShakeSosListener />
    </ThemeProvider>
  );
}
