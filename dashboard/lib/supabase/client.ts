import type { Database } from '@safepath/shared-types';
import { createBrowserClient } from '@supabase/ssr';

// Use this client in Client Components.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
