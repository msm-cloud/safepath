import type { RefObject } from 'react';
import type { TextInput } from 'react-native';

// KeyboardAvoidingView (and, on Android, windowSoftInputMode="resize" —
// see app.json) only make ROOM for the keyboard; neither one moves the
// scroll position to bring an already-below-the-fold focused field into
// that newly-available room. That's the actual bug behind "the field is
// completely hidden behind the keyboard" — wrapping in
// KeyboardAvoidingView + ScrollView alone doesn't fix it.
//
// This wires the fix using React Native's own ScrollView API, not a
// third-party library: `scrollResponderScrollNativeHandleToKeyboard` is
// core React Native (see
// node_modules/react-native/Libraries/Components/ScrollView/ScrollView.js),
// and its own doc comment says exactly this: "This method should be used
// as the callback to onFocus in a TextInput's parent view." It computes
// the scroll offset from the keyboard's actual on-screen position
// (via Keyboard.metrics(), with its own internal retry if that isn't
// known yet at focus time) rather than a guessed value, and works
// regardless of which windowSoftInputMode is actually in effect.
//
// Deliberately NOT react-native-keyboard-aware-scroll-view: its last
// release (0.9.5) was published June 2022, well before this project's
// React Native version (0.86.2) and before the New Architecture became
// the default — a real compatibility risk, not just an unnecessary
// dependency. RN's own core mechanism has none of that risk.
const KEYBOARD_SCROLL_OFFSET = 16;

// The subset of ScrollView's imperative API this needs. Typed narrowly
// here (rather than importing ScrollView's own type) so the same helper
// works for both a direct ScrollView ref and a FlatList's
// getScrollResponder() result — see the comment at its call site in
// emergency-contacts.tsx for why that one needs a cast to this shape.
export type ScrollResponderHandle = {
  scrollResponderScrollNativeHandleToKeyboard: (
    nodeHandle: unknown,
    additionalOffset?: number,
    preventNegativeScrollOffset?: boolean
  ) => void;
};

export function scrollInputIntoView(
  scrollResponder: ScrollResponderHandle | null | undefined,
  inputRef: RefObject<TextInput | null>
) {
  const input = inputRef.current;
  if (
    !scrollResponder ||
    typeof scrollResponder.scrollResponderScrollNativeHandleToKeyboard !== 'function' ||
    !input
  ) {
    return;
  }
  try {
    scrollResponder.scrollResponderScrollNativeHandleToKeyboard(
      input,
      KEYBOARD_SCROLL_OFFSET,
      true
    );
  } catch {
    // Best-effort — this is a convenience scroll, not something that
    // should ever be able to break a form. Confirmed present and callable
    // on this project's RN/react-native-web build without throwing (see
    // PR description for how that was verified); the guard above and this
    // catch are defensive for any platform this wasn't tested on.
  }
}
