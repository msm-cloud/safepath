import type { Database } from '@safepath/shared-types';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { timeoutFetch } from './timeout-fetch';

const REQUEST_TIMEOUT_MS = 8000;

export type ServerClientOptions = {
  requestTimeoutMs?: number;
  // PostgREST retries failed reads three times (1 s, 2 s, 4 s) by default.
  retry?: boolean;
};

// Use this client in Server Components, Server Actions, and Route Handlers.
export async function createClient({
  requestTimeoutMs = REQUEST_TIMEOUT_MS,
  retry = true,
}: ServerClientOptions = {}) {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: timeoutFetch(requestTimeoutMs) },
      db: { retry },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This is fine — middleware.ts refreshes the session cookie on
            // every request, so it doesn't need to happen here too.
          }
        },
      },
    }
  );
}
