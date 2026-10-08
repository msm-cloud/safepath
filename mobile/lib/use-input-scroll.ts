import { HeaderHeightContext } from 'expo-router/react-navigation';
import { use, useEffect, useState, type RefObject } from 'react';
import type { ScrollView, TextInput } from 'react-native';

import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';

type InputRef = RefObject<TextInput | null>;

// Keeps the focused field of a Screen form above the keyboard, including
// under a navigation header (the header height is passed as `topInset`,
// see lib/scroll-to-input.ts). The scroll runs once the keyboard height is
// known: Screen only gains scroll range after it pads for the keyboard, so
// scrolling at focus time alone stops short. Moving to another field while
// the keyboard is open scrolls again.
//
// Usage: `onFocus={() => onInputFocus(nameRef)} onBlur={() => onInputBlur(nameRef)}`.
export function useInputScroll(scrollRef: RefObject<ScrollView | null>) {
  const headerHeight = use(HeaderHeightContext) ?? 0;
  const keyboardHeight = useKeyboardHeight();
  const [focusedInput, setFocusedInput] = useState<InputRef | null>(null);

  useEffect(() => {
    if (!focusedInput || keyboardHeight === 0) return;
    const frame = requestAnimationFrame(() =>
      scrollInputIntoView(scrollRef.current, focusedInput, headerHeight)
    );
    return () => cancelAnimationFrame(frame);
  }, [focusedInput, keyboardHeight, headerHeight, scrollRef]);

  return {
    onInputFocus: (inputRef: InputRef) => setFocusedInput(inputRef),
    // Only clears its own field, so the order of blur and focus events
    // when moving between fields doesn't matter.
    onInputBlur: (inputRef: InputRef) =>
      setFocusedInput((current) => (current === inputRef ? null : current)),
  };
}
