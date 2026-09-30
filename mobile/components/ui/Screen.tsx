import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode, Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '@/lib/use-keyboard-height';
import { colors as palette, useTheme } from '@/theme';
import { backgroundSources, type ScreenBackground } from '@/theme/backgrounds';
import { SurfaceToneContext } from '@/theme/surface-tone';

export type ScreenProps = {
  children: ReactNode;
  // Only for welcome, auth, onboarding and empty-state screens; see
  // theme/backgrounds.ts.
  background?: ScreenBackground;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  // Lets a form call scrollInputIntoView (lib/scroll-to-input.ts) for the
  // focused field.
  scrollRef?: Ref<ScrollView>;
};

// Shown under the overlay while a photo is loading or not yet chosen, so
// overlay text stays readable either way.
const PHOTO_FALLBACK = palette.dark.bg;

export default function Screen({
  children,
  background,
  scroll = true,
  padded = true,
  edges = ['top', 'bottom'],
  contentStyle,
  scrollRef,
}: ScreenProps) {
  const { colors, sizes, spacing } = useTheme();
  const keyboardHeight = useKeyboardHeight();
  const source = background ? backgroundSources[background] : null;

  const bottom = padded ? spacing.xl : 0;
  const padding: ViewStyle = padded
    ? { paddingHorizontal: sizes.screenGutter, paddingTop: spacing.lg, paddingBottom: bottom }
    : {};

  const body = scroll ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // Same Android workaround as the auth screens: KeyboardAvoidingView
      // runs a LayoutAnimation on every keyboard event there, which can drop
      // focus from the active field.
      enabled={Platform.OS === 'ios'}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        // Padding by the keyboard height gives short screens real scroll
        // range, see lib/use-keyboard-height.ts.
        contentContainerStyle={[
          styles.grow,
          padding,
          contentStyle,
          { paddingBottom: bottom + keyboardHeight },
        ]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <View style={[styles.flex, padding, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: background ? PHOTO_FALLBACK : colors.bg }]}>
      {background && (
        <>
          {source && (
            <Image
              source={source}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessible={false}
              transition={200}
            />
          )}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
          <StatusBar style="light" />
        </>
      )}
      <SurfaceToneContext value={background ? 'image' : 'default'}>
        <SafeAreaView style={styles.flex} edges={edges}>
          {body}
        </SafeAreaView>
      </SurfaceToneContext>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  grow: {
    flexGrow: 1,
  },
});
