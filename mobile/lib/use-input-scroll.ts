import { HeaderHeightContext } from 'expo-router/react-navigation';
import { use, useEffect, useState, type RefObject } from 'react';
import type { ScrollView, TextInput } from 'react-native';

import { scrollInputIntoView } from '@/lib/scroll-to-input';
import { useKeyboardHeight } from '@/lib/use-keyboard-height';

type InputRef = RefObject<TextInput | null>;

// Keeps the focused field of a Screen form above the keyboard. React
// Native's keyboard scroll assumes the scroll view starts at the top of the
// screen (see lib/scroll-to-input.ts), so the space above it is passed
// along: the navigation header height, plus `topInset` for anything else,
// such as the safe-area padding of a Screen with the 'top' edge.
//
// The scroll runs once the keyboard height is known. At focus time Android
// hasn't reported the keyboard yet, so React Native measures against a
// closed keyboard and, for a field low on a scrolled page, clamps to offset
// 0 and jumps to the top. Screen also only gains scroll range after it pads
// for the keyboard. Moving to another field while the keyboard is open
// scrolls again.
//
// Usage: `onFocus={() => onInputFocus(nameRef)} onBlur={() => onInputBlur(nameRef)}`.
export function useInputScroll(scrollRef: RefObject<ScrollView | null>, topInset = 0) {
  const inset = (use(HeaderHeightContext) ?? 0) + topInset;
  const keyboardHeight = useKeyboardHeight();
  const [focusedInput, setFocusedInput] = useState<InputRef | null>(null);

  useEffect(() => {
    if (!focusedInput || keyboardHeight === 0) return;
    const frame = requestAnimationFrame(() =>
      scrollInputIntoView(scrollRef.current, focusedInput, inset)
    );
    return () => cancelAnimationFrame(frame);
  }, [focusedInput, keyboardHeight, inset, scrollRef]);

  return {
    onInputFocus: (inputRef: InputRef) => setFocusedInput(inputRef),
    // Only clears its own field, so the order of blur and focus events
    // when moving between fields doesn't matter.
    onInputBlur: (inputRef: InputRef) =>
      setFocusedInput((current) => (current === inputRef ? null : current)),
  };
}
