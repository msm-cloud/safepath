'use client';

import { useLanguage } from '@/lib/language-context';

// Simple two-option switch — বাংলা / English. Updates the Context
// immediately. The choice is always kept in a cookie (see
// lib/language-context.tsx); the dashboard's toggle also saves it to
// profiles.preferred_language.
export default function LanguageToggle({ saveToProfile = false }: { saveToProfile?: boolean }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t('languageSwitchLabel')}
      className="flex w-fit shrink-0 items-center gap-0.5 rounded-pill bg-track p-1"
    >
      <button
        type="button"
        onClick={() => setLanguage('bn', { saveToProfile })}
        aria-pressed={language === 'bn'}
        className={`min-h-9 rounded-pill px-3 type-label transition-colors ${
          language === 'bn' ? 'bg-ink text-on-ink' : 'text-text hover:bg-surface-muted'
        }`}
      >
        {t('languageBn')}
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en', { saveToProfile })}
        aria-pressed={language === 'en'}
        className={`min-h-9 rounded-pill px-3 type-label transition-colors ${
          language === 'en' ? 'bg-ink text-on-ink' : 'text-text hover:bg-surface-muted'
        }`}
      >
        {t('languageEn')}
      </button>
    </div>
  );
}
