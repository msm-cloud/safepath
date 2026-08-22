import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    // No navigation call needed: the session change is picked up by
    // AuthProvider, and Stack.Protected in the root layout redirects to the
    // (auth) group automatically.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      {session?.user.email && <Text style={styles.email}>Signed in as {session.user.email}</Text>}

      <Pressable
        style={[styles.button, signingOut && styles.buttonDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Out</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#d33',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
