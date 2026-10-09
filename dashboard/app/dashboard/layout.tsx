import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import Banner from '@/components/ui/Banner';
import { signOutAction } from '@/lib/auth-actions';
import { createPageClient, getAuthState } from '@/lib/supabase/auth-state';
import { t, type Language } from '@/lib/translations';

import ConnectionProblem from './connection-problem';
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
  // Only a definite "no valid session" goes to /login. A slow or failed
  // check keeps the page, so a guardian watching an active SOS isn't
  // thrown out by a network blip.
  const auth = await getAuthState();
  if (auth.status === 'signed-out') {
    redirect('/login');
  }

  const { user } = auth;

  const supabase = await createPageClient();
  const { data: profile, error: profileError } = user
    ? await supabase
        .from('profiles')
        .select('role, phone, preferred_language')
        .eq('id', user.id)
        .single()
    : { data: null, error: null };

  // No row (PGRST116) is a real answer; anything else is the network again.
  if (profile ? profile.role !== 'guardian' : profileError?.code === 'PGRST116') {
    redirect('/guardian-only');
  }
  const connectionProblem = auth.status === 'unavailable' || !profile;

  // Sign-up doesn't check whether a phone is already taken (that would let
  // anyone look up registered numbers), so handle_new_user() drops a
  // duplicate one silently. The account owner finds out here instead.
  const signedUpWithPhone =
    auth.status === 'signed-in' && typeof auth.user.user_metadata?.phone === 'string';
  const phoneNotSaved = signedUpWithPhone && profile !== null && !profile.phone;
  const language: Language = profile?.preferred_language ?? 'bn';

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <DashboardHeader email={user?.email} signOutAction={signOutAction} />
      {/* The banner sits in the content column so the sidebar stays full
          height on wide screens. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {connectionProblem && (
          <div className="mx-auto w-full max-w-4xl px-gutter pt-6 lg:px-8">
            <ConnectionProblem />
          </div>
        )}
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
