import { useEffect, useState } from 'react';

import { consumeOnboardingPending } from '@/lib/onboarding-storage';

// Checks (once, on mount, for the given userId) whether this account has
// a pending first-time-onboarding flag, and consumes it if so.
//
// `checking` is true only for the brief moment the AsyncStorage read is
// in flight — callers (the role-appropriate landing screens) should
// render nothing while it's true, rather than flashing their normal
// content first and then swapping to onboarding a beat later.
export function usePendingOnboarding(userId: string | undefined) {
  const [checking, setChecking] = useState(true);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no async work to do without a userId, so there's nothing to synchronize with an external system here — just resolving "checking" to its final value for this (rare, defensive-only) case.
      setChecking(false);
      return;
    }

    consumeOnboardingPending(userId).then((pending) => {
      if (cancelled) return;
      setShow(pending);
      setChecking(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const dismiss = () => setShow(false);

  return { checking, show, dismiss };
}
