import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import ShakeSosListener from '@/components/ShakeSosListener';
import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { LanguageProvider } from '@/lib/language-context';
import { UserSettingsProvider } from '@/lib/user-settings-context';
import { useBrandFonts } from '@/theme/fonts';

// NOTE: the live-location-sharing background task (TaskManager.defineTask)
// is registered from the custom entry point mobile/index.js, NOT here.
// This file is only evaluated on a UI launch; a headless launch for a
// background location delivery never renders the route tree, so a task
// defined here would be undefined on exactly the launches that need it.

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding until we know whether there's
// an existing session — otherwise the app would flash the wrong stack
// (tabs vs. sign-in) before Stack.Protected below can redirect. It also
// waits for the brand fonts so text doesn't re-flow after first paint.
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
  const fontsReady = useBrandFonts();
  const ready = !loading && fontsReady;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Base of the status bar stack, so it must mount before any screen.
          Photo screens push a light style on top; without this entry,
          leaving one falls back to React Native's default (white icons),
          which disappear on a light background. Set from the app's own
          scheme rather than "auto", which reads an unspecified system
          scheme as dark while the app falls back to light. */}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
