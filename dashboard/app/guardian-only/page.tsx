'use client';

import { useLanguage } from '@/lib/language-context';
import { signOutAction } from '@/lib/auth-actions';
import { publicCard, publicSubtitle, publicTitle } from '@/components/public-page-styles';
import { buttonClasses } from '@/components/ui/Button';

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
    <main className={publicCard}>
      <h1 className={publicTitle}>{t('guardianOnlyTitle')}</h1>
      <p className={publicSubtitle}>{t('guardianOnlyMessage')}</p>

      <form action={signOutAction} className="mt-4">
        <button type="submit" className={buttonClasses({ fullWidth: true })}>
          {t('signInWithGuardianAccountLink')}
        </button>
      </form>
    </main>
  );
}
