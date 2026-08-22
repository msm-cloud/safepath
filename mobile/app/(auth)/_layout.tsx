import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Sign In' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Sign Up' }} />
    </Stack>
  );
}
