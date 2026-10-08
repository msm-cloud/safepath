'use client';

import { useLanguage } from '@/lib/language-context';

// Simple two-option switch — বাংলা / English. Updates the Context
// immediately; persistence to profiles.preferred_language happens inside
// setLanguage itself (see lib/language-context.tsx).
export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex w-fit shrink-0 items-center gap-0.5 rounded-pill bg-track p-1">
      <button
        type="button"
        onClick={() => setLanguage('bn')}
        aria-pressed={language === 'bn'}
        className={`min-h-9 rounded-pill px-3 type-label transition-colors ${
          language === 'bn' ? 'bg-ink text-on-ink' : 'text-text hover:bg-surface-muted'
        }`}
      >
        {t('languageBn')}
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
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
