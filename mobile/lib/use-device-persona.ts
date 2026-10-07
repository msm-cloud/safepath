import { useEffect, useState } from 'react';

import { loadDevicePersona } from '@/lib/onboarding-storage';
import { devicePersonaForRole, type Persona, type ProfileRole } from '@/lib/personas';

// The persona saved on this device at sign-up (see lib/onboarding-storage.ts),
// or null when it doesn't fit the account's role. `loading` lets the caller
// wait for the read instead of flashing the neutral wording first.
export function useDevicePersona(userId: string | undefined, role: ProfileRole) {
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
      setPersona(devicePersonaForRole(value, role));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, role]);

  return { loading, persona };
}
