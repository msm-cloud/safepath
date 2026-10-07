import type { Persona, ProfileRole } from '@/lib/personas';

// Lets a new session into the app only once its profiles.role matches the
// card picked on the welcome screen. Free of React Native and Supabase
// imports so it can be unit tested under plain Node; AuthProvider
// (lib/auth-context.tsx) binds it to Supabase.

type SessionLike = { user: { id: string } };

// A sign-in or sign-up call; `error` is the message to show, or null on
// success.
export type AuthAttempt = () => Promise<{ error: string | null }>;

export type SignInAsResult =
  | { kind: 'signed_in'; userId: string }
  // Sign-up waiting for email confirmation: no session yet.
  | { kind: 'no_session' }
  // null message: signed in, but the role couldn't be checked.
  | { kind: 'failed'; message: string | null }
  // The account belongs to the other card. It has been signed out again
  // without routing anywhere.
  | { kind: 'role_mismatch'; role: ProfileRole };

export type SignInGateDeps<S extends SessionLike> = {
  currentSession: () => Promise<S | null>;
  fetchRole: (userId: string) => Promise<ProfileRole | null>;
  // Must not end the account's sessions on other devices.
  signOutLocal: () => Promise<void>;
  // Routes the session into the app.
  admit: (session: S, role: ProfileRole) => Promise<void>;
  matchesRole: (persona: Persona, role: ProfileRole) => boolean;
};

export type SignInGate<S extends SessionLike = SessionLike> = {
  park: (session: S | null) => boolean;
  signInAs: (persona: Persona, attempt: AuthAttempt) => Promise<SignInAsResult>;
};

export function createSignInGate<S extends SessionLike>(deps: SignInGateDeps<S>): SignInGate<S> {
  // Set while signInAs() checks a new session; auth events that arrive
  // meanwhile are parked here instead of routing.
  let held: { session: S | null } | null = null;

  return {
    // True when the event was parked; the caller must not route it.
    park(session: S | null): boolean {
      if (!held) return false;
      held.session = session;
      return true;
    },

    async signInAs(persona: Persona, attempt: AuthAttempt): Promise<SignInAsResult> {
      const current: { session: S | null } = { session: null };
      held = current;
      try {
        const { error } = await attempt();
        if (error !== null) return { kind: 'failed', message: error };

        const session = current.session ?? (await deps.currentSession());
        if (!session) return { kind: 'no_session' };

        const role = await deps.fetchRole(session.user.id);
        if (role === null || !deps.matchesRole(persona, role)) {
          await deps.signOutLocal();
          return role === null
            ? { kind: 'failed', message: null }
            : { kind: 'role_mismatch', role };
        }

        held = null;
        // The latest parked event wins, e.g. a token refresh meanwhile.
        await deps.admit(current.session ?? session, role);
        return { kind: 'signed_in', userId: session.user.id };
      } finally {
        if (held === current) held = null;
      }
    },
  };
}
