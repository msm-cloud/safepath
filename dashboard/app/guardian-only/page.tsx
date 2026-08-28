'use client';

import { useLanguage } from '@/lib/language-context';
import { signOutAction } from '@/lib/auth-actions';

// Reached only via the redirect in app/dashboard/layout.tsx, when a
// signed-in account's profiles.role isn't 'guardian' — this dashboard was
// always meant to be guardian-only. Not itself gated (someone could land
// here directly), since it has nothing to protect: just an explanation
// and a way out.
//
// The "sign in with a guardian account" action is a real sign-out
// (reusing the same signOutAction the dashboard header already uses),
// not just a link to /login — the current session belongs to the wrong
// account, and clearing it first is what actually lets someone sign in
// as a different one instead of just seeing the same account's session
// silently persist underneath the login form.
export default function GuardianOnlyPage() {
  const { t } = useLanguage();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t('guardianOnlyTitle')}</h1>
      <p className="max-w-sm text-sm text-zinc-500">{t('guardianOnlyMessage')}</p>

      <form action={signOutAction} className="mt-4">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {t('signInWithGuardianAccountLink')}
        </button>
      </form>
    </main>
  );
}
