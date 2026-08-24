'use client';

import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { t as translate, type Language, type TranslationKey } from '@/lib/translations';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

// Unlike mobile (which has to fetch the signed-in user's
// preferred_language client-side after auth resolves, causing a brief
// flash of the 'bn' default), the dashboard's root layout is a Server
// Component that already fetches the user server-side — so it can pass
// the real preferred_language in as `initialLanguage` and this provider
// never needs to guess. See dashboard/app/layout.tsx.
export function LanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language;
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').update({ preferred_language: next }).eq('id', user.id);
      }
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
