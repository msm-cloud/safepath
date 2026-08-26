import { useEffect, useState } from 'react';
import { Keyboard, type KeyboardEvent, Platform } from 'react-native';

// Tracks the on-screen keyboard's current height (0 when hidden).
//
// Needed for a real, confirmed reason, not defensively: a short screen's
// ScrollView content — sized via contentContainerStyle's flexGrow: 1 to
// always exactly fill the ScrollView's own box (so short content still
// looks centered rather than pinned to the top) — ends up with its
// scrollHeight always exactly equal to its clientHeight, no matter how
// small that box gets. Confirmed by measuring it directly: on
// (auth)/sign-in.tsx, scrollHeight and clientHeight were identical at
// full viewport height AND after shrinking the viewport to simulate a
// keyboard eating a third of the screen — there was never any scroll
// range at all. That makes
// scrollResponderScrollNativeHandleToKeyboard's scrollTo() call (see
// lib/scroll-to-input.ts) a silent no-op on a screen like this: it
// computes a real target offset, but the ScrollView has nowhere to
// scroll to. Padding the content by the keyboard's actual height gives
// it real range to work with — confirmed the same way: adding that much
// bottom padding made scrollHeight exceed clientHeight immediately.
//
// keyboardWillShow/Hide exist on iOS only; keyboardDidShow/Hide are the
// cross-platform pair (Android has no "will" variants).
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEventName = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEventName, (event: KeyboardEvent) => {
      setHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSubscription = Keyboard.addListener(hideEventName, () => {
      setHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return height;
}
