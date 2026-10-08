import type { ProfileRole } from '@/lib/personas';

// Turns auth events into the { session, role, loading } the root layout
// routes on. Free of React Native and Supabase imports so it can be unit
// tested under plain Node; AuthProvider (lib/auth-context.tsx) binds it.
//
// The root layout renders nothing while `loading` is true, which unmounts
// every screen. So `loading` is only ever true until the first auth
// resolution finishes. Token refreshes and resumes for the same account
// keep the navigator mounted and re-check the role in the background — an
// SOS countdown, journey or fake call must survive them.

type SessionLike = { user: { id: string } };

export type AuthSnapshot<S extends SessionLike> = {
  session: S | null;
  role: ProfileRole | null;
  loading: boolean;
};

export type RootRoute = 'splash' | 'auth' | 'user' | 'guardian';

export type AuthSessionDeps<S extends SessionLike> = {
  fetchRole: (userId: string) => Promise<ProfileRole | null>;
  readCachedRole: (userId: string) => Promise<ProfileRole | null>;
  writeCachedRole: (userId: string, role: ProfileRole) => Promise<void>;
  resolveRole: (fetched: ProfileRole | null, cached: ProfileRole | null) => ProfileRole;
  publish: (snapshot: AuthSnapshot<S>) => void;
};

export type AuthSession<S extends SessionLike> = {
  // `knownRole` skips the fetch when the caller has just checked it.
  apply: (session: S | null, knownRole?: ProfileRole) => Promise<void>;
  snapshot: () => AuthSnapshot<S>;
};

export const INITIAL_AUTH_SNAPSHOT: AuthSnapshot<never> = {
  session: null,
  role: null,
  loading: true,
};

// Which Stack.Protected group app/_layout.tsx mounts.
export function rootRoute<S extends SessionLike>(snapshot: AuthSnapshot<S>): RootRoute {
  if (snapshot.loading) return 'splash';
  if (!snapshot.session) return 'auth';
  return snapshot.role === 'guardian' ? 'guardian' : 'user';
}

export function createAuthSession<S extends SessionLike>(deps: AuthSessionDeps<S>): AuthSession<S> {
  let current: AuthSnapshot<S> = INITIAL_AUTH_SNAPSHOT;
  // Bumped on every apply so a slow role fetch can't overwrite a newer
  // event, e.g. re-admit a session that has since signed out.
  let generation = 0;

  const publish = (next: AuthSnapshot<S>) => {
    current = next;
    deps.publish(next);
  };

  // Only a role confirmed by the server is cached: the offline fallback is
  // a guess and must not outlive the next launch that can check it.
  async function resolveRole(userId: string, knownRole?: ProfileRole): Promise<ProfileRole> {
    const fetched = knownRole ?? (await deps.fetchRole(userId));
    if (fetched) {
      void deps.writeCachedRole(userId, fetched);
      return fetched;
    }
    // Offline, the role cached on this device keeps a guardian out of the
    // student home.
    return deps.resolveRole(null, await deps.readCachedRole(userId));
  }

  // Same account, role already known: swap in the new tokens at once and
  // only change the role if the server now says something different. A
  // failed fetch keeps the role it already has.
  async function refresh(session: S, knownRole?: ProfileRole) {
    const userId = session.user.id;
    publish({ ...current, session });
    const role = knownRole ?? (await deps.fetchRole(userId));
    if (!role || current.session?.user.id !== userId) return;
    void deps.writeCachedRole(userId, role);
    if (role !== current.role) publish({ ...current, role });
  }

  return {
    async apply(session, knownRole) {
      const gen = ++generation;

      if (!session) {
        publish({ session: null, role: null, loading: false });
        return;
      }

      const userId = session.user.id;
      if (!current.loading && current.role && current.session?.user.id === userId) {
        await refresh(session, knownRole);
        return;
      }

      // First resolution, or a different account. The previous snapshot
      // stays up until the role is known: publishing a session without a
      // role makes every Stack.Protected guard false at once, which shows
      // Expo Router's "This screen doesn't exist" fallback.
      const role = await resolveRole(userId, knownRole);
      if (gen !== generation) return;
      publish({ session, role, loading: false });
    },

    snapshot: () => current,
  };
}
