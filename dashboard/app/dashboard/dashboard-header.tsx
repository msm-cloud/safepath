'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { GridIcon, SettingsIcon, ShieldLogo } from '@/components/ui/icons';
import { useLanguage } from '@/lib/language-context';

import LanguageToggle from './language-toggle';

// One element for both layouts: a top bar on phones and tablets, the ink
// sidebar from the design board on wide screens.
export default function DashboardHeader({
  email,
  signOutAction,
}: {
  email: string | undefined;
  signOutAction: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: t('dashboardTitle'), Icon: GridIcon },
    { href: '/dashboard/settings', label: t('settingsLink'), Icon: SettingsIcon },
  ];

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-3 bg-ink px-gutter py-3 text-on-ink lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-6 lg:px-4 lg:py-6 dark:border-b dark:border-border dark:bg-surface dark:text-text lg:dark:border-r lg:dark:border-b-0">
      <span className="flex items-center lg:px-2">
        <ShieldLogo />
      </span>

      <nav className="flex flex-1 gap-1 lg:flex-none lg:flex-col">
        {links.map(({ href, label, Icon }) => {
          const current = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 type-label transition-colors ${
                current
                  ? 'bg-ink-pressed dark:bg-surface-muted'
                  : 'opacity-80 hover:bg-ink-pressed hover:opacity-100 dark:hover:bg-surface-muted'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex w-full items-center gap-3 lg:mt-auto lg:flex-col lg:items-stretch lg:border-t lg:border-ink-pressed lg:pt-4 lg:dark:border-border">
        <span className="min-w-0 flex-1 truncate type-caption opacity-80 lg:flex-none lg:px-2">
          {email}
        </span>
        <LanguageToggle />
        <form action={signOutAction}>
          <button
            type="submit"
            className="min-h-11 rounded-md px-3 type-label underline-offset-2 hover:bg-ink-pressed hover:underline lg:w-full lg:text-left dark:hover:bg-surface-muted"
          >
            {t('signOutLink')}
          </button>
        </form>
      </div>
    </header>
  );
}
