import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { signOutAction } from '@/lib/auth-actions';
import { createClient } from '@/lib/supabase/server';

import DashboardHeader from './dashboard-header';

// Wraps both /dashboard and /dashboard/[userId] — gates both on auth AND
// role. This dashboard was always meant to be guardian-only; until now
// this layout only checked whether someone was signed in at all, so any
// account — regardless of profiles.role — got full access. That gap is
// exactly what let a student-role test account appear to "work fine as
// a guardian" here while mobile's own role-based routing correctly sent
// it to the student experience (see the PR that added the role check
// below for the full investigation).
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'guardian') {
    redirect('/guardian-only');
  }

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader email={user.email} signOutAction={signOutAction} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
