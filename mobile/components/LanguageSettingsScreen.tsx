import { StyleSheet, View } from 'react-native';

import LanguageToggle from '@/components/LanguageToggle';

// Shared between the student ((tabs)/language.tsx) and guardian
// ((guardian)/language.tsx) tab groups — reachable from Settings in
// either stack, same pattern as ChangePasswordScreen.tsx.
//
// Purely a relocation: LanguageToggle itself (and the
// LanguageProvider/context it reads and writes) is completely unchanged
// — this screen only moves WHERE that existing control is rendered from.
export default function LanguageSettingsScreen() {
  return (
    <View style={styles.container}>
      <LanguageToggle />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
