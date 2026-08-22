import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { signOutAction } from '@/lib/auth-actions';
import { createClient } from '@/lib/supabase/server';

// Wraps both /dashboard and /dashboard/[userId] — gates both on auth.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <span className="text-sm text-zinc-500">{user.email}</span>
        <form action={signOutAction}>
          <button type="submit" className="text-sm font-medium text-red-600 underline">
            Sign out
          </button>
        </form>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
