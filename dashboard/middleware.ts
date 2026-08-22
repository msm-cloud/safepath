import type { Database } from '@safepath/shared-types';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Standard Supabase Next.js App Router pattern: the server client (used in
// Server Components/Actions) can read cookies but can't reliably write a
// refreshed session cookie back — only middleware, which runs before every
// request, can. Without this, sessions would silently expire instead of
// auto-refreshing. This does not decide access to any route by itself —
// dashboard/app/dashboard/layout.tsx does that.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Required: this call is what actually refreshes the session. Do not
  // remove it or insert other logic between client creation and this call.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
