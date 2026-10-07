import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { createAuthSession, INITIAL_AUTH_SNAPSHOT, type AuthSnapshot } from '@/lib/auth-session';
import { stopLiveSharing, stopLiveSharingOnDevice } from '@/lib/live-sharing';
import { profileCache } from '@/lib/device-profile-cache';
import { resetLocationHistoryOnDevice } from '@/lib/location-history';
import {
  personaMatchesRole,
  resolveSessionRole,
  type Persona,
  type ProfileRole,
} from '@/lib/personas';
import {
  createSignInGate,
  type AuthAttempt,
  type SignInAsResult,
  type SignInGate,
} from '@/lib/sign-in-gate';
import { clearSosContactsCache } from '@/lib/sos-contacts';
import { supabase } from '@/lib/supabase';

export type { ProfileRole } from '@/lib/personas';

export type { AuthAttempt, SignInAsResult } from '@/lib/sign-in-gate';

type AuthContextValue = {
  session: Session | null;
  // The signed-in profile's role — determines which tab group (student vs
  // guardian) the root layout routes to. null while unauthenticated or not
  // yet fetched.
  role: ProfileRole | null;
  // True only while the initial getSession() check (and, if a session
  // exists, the role fetch that follows it) is in flight — lets the root
  // layout hold the splash screen instead of flashing sign-in, or the
  // wrong tab group, before both are known. Never true again after that:
  // the root layout unmounts every screen while it is.
  loading: boolean;
  // Runs a sign-in or sign-up for the card picked on the welcome screen and
  // only lets the new session into the app once profiles.role matches it.
  signInAs: (persona: Persona, attempt: AuthAttempt) => Promise<SignInAsResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchRole(userId: string): Promise<ProfileRole | null> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
  return data?.role ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ session, role, loading }, setSnapshot] =
    useState<AuthSnapshot<Session>>(INITIAL_AUTH_SNAPSHOT);
  const gateRef = useRef<SignInGate<Session> | null>(null);

  useEffect(() => {
    let mounted = true;
    const auth = createAuthSession<Session>({
      fetchRole,
      readCachedRole: (userId) => profileCache.readRole(userId),
      writeCachedRole: (userId, resolved) => profileCache.writeRole(userId, resolved),
      resolveRole: resolveSessionRole,
      publish: (next) => {
        if (mounted) setSnapshot(next);
      },
    });
    const applySession = auth.apply;

    const gate = createSignInGate<Session>({
      currentSession: async () => (await supabase.auth.getSession()).data.session,
      fetchRole,
      signOutLocal: async () => {
        await supabase.auth.signOut({ scope: 'local' });
      },
      admit: applySession,
      matchesRole: personaMatchesRole,
    });
    gateRef.current = gate;

    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    // Keeps `session` (and `role`) in sync with sign-in, sign-out, and
    // token refresh — this is also what drives the Stack.Protected
    // redirect in the root layout after a successful sign-in/sign-up/
    // sign-out. Refreshes for the signed-in account never unmount the
    // navigator; see lib/auth-session.ts.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (gate.park(newSession)) return;
      void applySession(newSession);
    });

    return () => {
      mounted = false;
      gateRef.current = null;
      subscription.unsubscribe();
    };
  }, []);

  const signInAs = useCallback(
    (persona: Persona, attempt: AuthAttempt): Promise<SignInAsResult> =>
      // The auth screens only render after the effect above has run.
      gateRef.current?.signInAs(persona, attempt) ??
      Promise.resolve({ kind: 'failed', message: null }),
    []
  );

  // Location tasks and their AsyncStorage state are per-device, not
  // per-account, and outlive the auth session — left running, they carry
  // on under whoever signs in next (a guardian then keeps writing to a
  // student's live-sharing session and gets every insert rejected by RLS).
  // Tear them down first, while still signed in as the owner so the
  // live-sharing session can be closed. Best-effort: nothing here may
  // block the sign-out itself.
  const signOut = async () => {
    try {
      const { ok } = await stopLiveSharing();
      // Couldn't close the session (e.g. offline) — still stop the device.
      if (!ok) await stopLiveSharingOnDevice();
    } catch (err) {
      console.warn('[auth] live-sharing teardown on sign-out failed:', err);
    }
    try {
      await resetLocationHistoryOnDevice();
    } catch (err) {
      console.warn('[auth] location-history teardown on sign-out failed:', err);
    }
    // The on-device copies hold the previous user's contacts, name and
    // preferences.
    const cleared = await Promise.allSettled([clearSosContactsCache(), profileCache.clear()]);
    for (const result of cleared) {
      if (result.status === 'rejected') {
        console.warn('[auth] offline cache clear on sign-out failed:', result.reason);
      }
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, role, loading, signInAs, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
