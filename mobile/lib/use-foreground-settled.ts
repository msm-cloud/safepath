import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// True once the app has been in the foreground for `delayMs`, false again
// as soon as it leaves. A dialog presented during the first moments of a
// launch (splash hiding, the first navigation) or while backgrounded can
// be dropped by Android without an error; gating on this makes it present
// on a settled screen and re-present on every return to the foreground.
export function useForegroundSettled(delayMs: number): boolean {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const update = (state: string) => {
      clearTimeout(timer);
      if (state === 'active') {
        timer = setTimeout(() => setSettled(true), delayMs);
      } else {
        setSettled(false);
      }
    };

    update(AppState.currentState);
    const subscription = AppState.addEventListener('change', update);
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [delayMs]);

  return settled;
}
