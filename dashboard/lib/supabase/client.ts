import { createBrowserClient } from '@supabase/ssr';

// NOTE: scaffolding only — no auth flow wired up yet. That comes in a later step.
// Use this client in Client Components.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
