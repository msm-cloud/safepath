import { Stack } from 'expo-router';

// Each signed-out screen draws its own header (components/AuthHeader.tsx)
// on top of the background photo, so the navigation header is hidden.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
