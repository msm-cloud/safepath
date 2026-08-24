'use client';

import { useLanguage } from '@/lib/language-context';

import LanguageToggle from './language-toggle';

export default function DashboardHeader({
  email,
  signOutAction,
}: {
  email: string | undefined;
  signOutAction: () => Promise<void>;
}) {
  const { t } = useLanguage();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
      <span className="text-sm text-zinc-500">{email}</span>
      <div className="flex items-center gap-4">
        <LanguageToggle />
        <form action={signOutAction}>
          <button type="submit" className="text-sm font-medium text-red-600 underline">
            {t('signOutLink')}
          </button>
        </form>
      </div>
    </header>
  );
}
