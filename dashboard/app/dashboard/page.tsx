import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

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
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">People you&apos;re linked to as a guardian.</p>
      </section>

      <section>
        <RedeemInviteForm />
      </section>

      <section className="flex flex-col gap-3">
        {error && <p className="text-sm text-red-600">{error.message}</p>}

        {!error && links.length === 0 && (
          <p className="text-sm text-zinc-500">
            You&apos;re not linked to anyone yet — use the form above to link to someone using the
            invite code they share with you.
          </p>
        )}

        {!error && links.length > 0 && (
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-medium"
              >
                {link.user?.full_name || 'Unnamed user'}
                {/* Alerts/location for this user will be added here in a
                    later step (SOS + journey tracking). Not built yet. */}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
