import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { stopLiveSharing, stopLiveSharingOnDevice } from '@/lib/live-sharing';
import { resetLocationHistoryOnDevice } from '@/lib/location-history';
import { supabase } from '@/lib/supabase';

export type ProfileRole = 'user' | 'guardian';

type AuthContextValue = {
  session: Session | null;
  // The signed-in profile's role — determines which tab group (student vs
  // guardian) the root layout routes to. null while unauthenticated or not
  // yet fetched.
  role: ProfileRole | null;
  // True only while the initial getSession() check (and, if a session
  // exists, the role fetch that follows it) is in flight — lets the root
  // layout hold the splash screen instead of flashing sign-in, or the
  // wrong tab group, before both are known.
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Falls back to 'user' rather than leaving `role` null indefinitely on
    // a fetch error — a stuck loading screen would be worse than a
    // reasonable default, and profiles_select_own means this fetch should
    // always succeed for a genuinely signed-in user anyway.
    async function loadRole(userId: string) {
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (!cancelled) setRole(data?.role ?? 'user');
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) {
        await loadRole(data.session.user.id);
      }
      if (!cancelled) setLoading(false);
    });

    // Keeps `session` (and `role`) in sync with sign-in, sign-out, and
    // token refresh — this is also what drives the Stack.Protected
    // redirect in the root layout after a successful sign-in/sign-up/
    // sign-out.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      if (newSession) {
        // Bug fixed here: `loading` used to only ever get set back to
        // false, once, inside the initial getSession() handler above —
        // never re-armed for a session change that happens *after* mount
        // (a sign-in or sign-up). That left a real window where
        // setSession() had already re-rendered the root layout with a
        // truthy session but `role` still at its old (null) value, which
        // makes every Stack.Protected guard in app/_layout.tsx false at
        // once — no matching screen, hence Expo Router's generic
        // "This screen doesn't exist" fallback. Re-arming loading here
        // closes that window: the root layout returns null (same as the
        // initial splash-holding state) until role is freshly known for
        // this exact session, instead of ever rendering the
        // session-without-role combination at all.
        setLoading(true);
        await loadRole(newSession.user.id);
        if (!cancelled) setLoading(false);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

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
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, role, loading, signOut }}>
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
