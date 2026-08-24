'use client';

import { useLanguage } from '@/lib/language-context';

// Simple two-option switch — বাংলা / English. Updates the Context
// immediately; persistence to profiles.preferred_language happens inside
// setLanguage itself (see lib/language-context.tsx).
export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-full border border-zinc-300 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => setLanguage('bn')}
        aria-pressed={language === 'bn'}
        className={`rounded-full px-2 py-1 font-medium transition-colors ${
          language === 'bn' ? 'bg-blue-600 text-white' : 'text-zinc-600'
        }`}
      >
        {t('languageBn')}
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={`rounded-full px-2 py-1 font-medium transition-colors ${
          language === 'en' ? 'bg-blue-600 text-white' : 'text-zinc-600'
        }`}
      >
        {t('languageEn')}
      </button>
    </div>
  );
}
