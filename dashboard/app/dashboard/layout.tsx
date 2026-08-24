import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { signOutAction } from '@/lib/auth-actions';
import { createClient } from '@/lib/supabase/server';

import DashboardHeader from './dashboard-header';

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
      <DashboardHeader email={user.email} signOutAction={signOutAction} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
