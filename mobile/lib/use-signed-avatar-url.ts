import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

// Turns a stored profiles.avatar_url value (a PATH into the private
// `avatars` bucket, e.g. "<uid>/avatar-1725000000000.jpg" — see the
// 20260830001300 migration's column comment) into a temporary signed URL
// the app can actually load an image from.
//
// The bucket is private, so there is no permanent public URL: every read
// needs a fresh `createSignedUrl` call. Results are cached module-wide by
// path so re-rendering an avatar (or showing the same person in two
// places) doesn't re-hit the API, and re-minted a few minutes before the
// token would expire.
//
// Cross-user reads (a guardian viewing their linked student's photo, and
// vice versa) work here because storage policy avatars_select_own_or_linked
// grants exactly that — mirroring the profiles_select_by_*_guardian pair.

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // re-mint when <5 min of life left

type CacheEntry = { url: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cachedUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const hit = cache.get(path);
  return hit && hit.expiresAt - Date.now() > REFRESH_MARGIN_MS ? hit.url : null;
}

export function useSignedAvatarUrl(path: string | null | undefined): string | null {
  // A still-valid cached URL is usable immediately, with no render flash
  // and no effect round-trip.
  const cached = cachedUrl(path);
  const [fetched, setFetched] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!path || cachedUrl(path)) return;

    let cancelled = false;
    supabase.storage
      .from('avatars')
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        cache.set(path, {
          url: data.signedUrl,
          expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
        });
        // setState from an async callback (external data arriving) is the
        // pattern the set-state-in-effect rule explicitly allows.
        setFetched({ path, url: data.signedUrl });
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (cached) return cached;
  if (fetched && fetched.path === path) return fetched.url;
  return null;
}

// Drops a path from the cache — call after replacing or removing an
// avatar so the next render re-mints (or falls back to initials) instead
// of serving a stale/dead signed URL.
export function forgetSignedAvatarUrl(path: string | null | undefined) {
  if (path) cache.delete(path);
}
