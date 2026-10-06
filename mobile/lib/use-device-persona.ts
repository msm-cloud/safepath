import { useEffect, useState } from 'react';

import { loadDevicePersona } from '@/lib/onboarding-storage';
import type { Persona } from '@/lib/personas';

// The persona saved on this device at sign-up (see lib/onboarding-storage.ts).
// `loading` lets the caller wait for the read instead of flashing the
// neutral wording first.
export function useDevicePersona(userId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing to read without a user id; just settle the loading state.
      setLoading(false);
      return;
    }

    loadDevicePersona(userId).then((value) => {
      if (cancelled) return;
      setPersona(value);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { loading, persona };
}
