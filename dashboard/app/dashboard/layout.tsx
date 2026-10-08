import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import Banner from '@/components/ui/Banner';
import { signOutAction } from '@/lib/auth-actions';
import { createClient } from '@/lib/supabase/server';
import { t, type Language } from '@/lib/translations';

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
    .select('role, phone, preferred_language')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'guardian') {
    redirect('/guardian-only');
  }

  // Sign-up doesn't check whether a phone is already taken (that would let
  // anyone look up registered numbers), so handle_new_user() drops a
  // duplicate one silently. The account owner finds out here instead.
  const signedUpWithPhone = typeof user.user_metadata?.phone === 'string';
  const phoneNotSaved = signedUpWithPhone && !profile.phone;
  const language: Language = profile.preferred_language ?? 'bn';

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <DashboardHeader email={user.email} signOutAction={signOutAction} />
      {/* The banner sits in the content column so the sidebar stays full
          height on wide screens. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {phoneNotSaved && (
          <div className="mx-auto w-full max-w-4xl px-gutter pt-6 lg:px-8">
            <Banner
              tone="warning"
              action={
                <Link href="/dashboard/settings">{t(language, 'phoneNotSavedSettingsLink')}</Link>
              }
            >
              {t(language, 'phoneNotSavedMessage')}
            </Banner>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
