import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

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
        await loadRole(newSession.user.id);
      } else {
        setRole(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
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
