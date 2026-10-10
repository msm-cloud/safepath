import { redirect } from 'next/navigation';

import { cookieLanguage } from '@/lib/language-server';
import { createPageClient, getAuthState } from '@/lib/supabase/auth-state';
import { t, type Language } from '@/lib/translations';
import Banner from '@/components/ui/Banner';

import ActiveAlerts from './active-alerts';
import LiveSharing from './live-sharing';
import PastAlerts from './past-alerts';
import RecordedLocation from './recorded-location';

type LinkedUserRow = {
  id: string;
  user: { id: string; full_name: string } | null;
};

export default async function DashboardPage() {
  // Same check as the layout (cached per request). The layout already
  // redirects visitors without a valid session before this page renders.
  const auth = await getAuthState();
  if (auth.status === 'signed-out') {
    redirect('/login');
  }

  // `user` is null only when the auth check failed and the session cookie
  // couldn't be read either. The queries are skipped, but the page keeps
  // the same shape so the client-side sections (an active SOS among them)
  // aren't remounted.
  const { user } = auth;
  const supabase = await createPageClient();

  // Server Component, so no LanguageContext access (Context is
  // Client-Component-only) — fetch the language directly here, and pass
  // it down to PastAlerts as a prop for the same reason.
  const { data: profile } = user
    ? await supabase.from('profiles').select('preferred_language').eq('id', user.id).single()
    : { data: null };
  const language: Language = profile?.preferred_language ?? (await cookieLanguage());

  const { data, error } = user
    ? await supabase
        .from('guardian_links')
        .select('id, user:profiles!guardian_links_user_id_fkey(id, full_name)')
        .eq('guardian_id', user.id)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false })
    : { data: null, error: null };

  const links = (data ?? []) as unknown as LinkedUserRow[];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-gutter py-6 lg:px-8 lg:py-8">
      <section>
        <h1 className="type-h1 text-text">{t(language, 'dashboardTitle')}</h1>
        <p className="mt-1 type-body text-text-muted">{t(language, 'dashboardSubtitle')}</p>
      </section>

      {/* Own client-side data lifecycle (initial fetch + Realtime
          subscription) — see active-alerts.tsx. Renders nothing when
          there's no active alert for any linked user. */}
      <ActiveAlerts />

      {/* Same self-contained pattern — renders nothing unless a linked
          person is actively sharing their live location. */}
      <LiveSharing />

      {/* Plain server-side fetch, not Realtime — see past-alerts.tsx. */}
      <PastAlerts language={language} />

      {/* Guardians create invite codes in the mobile app, where the family
          member reviews and accepts them; the web has no way to link. */}
      <section className="sm:max-w-md">
        <Banner tone="info" title={t(language, 'linkFromAppTitle')}>
          {t(language, 'linkFromAppBody')}
        </Banner>
      </section>

      {/* Own client-side fetch — renders nothing until this guardian has
          at least one linked person. Sits between the link-from-the-app note above
          and the linked-users list / header Settings link. */}
      <RecordedLocation />

      <section className="flex flex-col gap-3">
        {error && <p className="type-body-sm text-danger-text">{error.message}</p>}

        {!error && links.length === 0 && (
          <p className="type-body-sm text-text-muted">{t(language, 'noLinkedUsersYet')}</p>
        )}

        {!error && links.length > 0 && (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border-[1.5px] border-border bg-surface shadow-sm">
            {links.map((link) => (
              <li key={link.id} className="px-4 py-3 type-body-sm font-semibold text-text">
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
