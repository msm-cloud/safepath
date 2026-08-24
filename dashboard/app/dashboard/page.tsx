import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { t, type Language } from '@/lib/translations';

import ActiveAlerts from './active-alerts';
import PastAlerts from './past-alerts';
import RedeemInviteForm from './redeem-invite-form';

type LinkedUserRow = {
  id: string;
  user: { id: string; full_name: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensive — dashboard/app/dashboard/layout.tsx already redirects
  // unauthenticated visitors before this page ever renders.
  if (!user) {
    redirect('/login');
  }

  // Server Component, so no LanguageContext access (Context is
  // Client-Component-only) — fetch the language directly here, and pass
  // it down to PastAlerts as a prop for the same reason.
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language')
    .eq('id', user.id)
    .single();
  const language: Language = profile?.preferred_language ?? 'bn';

  const { data, error } = await supabase
    .from('guardian_links')
    .select('id, user:profiles!guardian_links_user_id_fkey(id, full_name)')
    .eq('guardian_id', user.id)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false });

  const links = (data ?? []) as unknown as LinkedUserRow[];

  return (
    <main className="flex flex-1 flex-col gap-10 p-16">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">{t(language, 'dashboardTitle')}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t(language, 'dashboardSubtitle')}</p>
      </section>

      {/* Own client-side data lifecycle (initial fetch + Realtime
          subscription) — see active-alerts.tsx. Renders nothing when
          there's no active alert for any linked user. */}
      <ActiveAlerts />

      {/* Plain server-side fetch, not Realtime — see past-alerts.tsx. */}
      <PastAlerts language={language} />

      <section>
        <RedeemInviteForm />
      </section>

      <section className="flex flex-col gap-3">
        {error && <p className="text-sm text-red-600">{error.message}</p>}

        {!error && links.length === 0 && (
          <p className="text-sm text-zinc-500">{t(language, 'noLinkedUsersYet')}</p>
        )}

        {!error && links.length > 0 && (
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-medium"
              >
                {link.user?.full_name || t(language, 'unnamedUser')}
                {/* An active alert for this user surfaces as its own card
                    at the top of the page — see <ActiveAlerts /> above.
                    Full journey/location history beyond "last known
                    location" is still a later step. */}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
