'use client';

import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback(
    (next: Language) => {
      // Updates every Client Component reading from this Context
      // immediately (the toggle's own highlight, DashboardHeader's "Sign
      // out", etc.).
      setLanguageState(next);

      (async () => {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Awaited deliberately: Server Components (dashboard/page.tsx,
        // past-alerts.tsx, and this provider's own root layout) can't use
        // this Context at all — they read profiles.preferred_language
        // directly and render their text with the pure t(language, key)
        // function. router.refresh() below re-runs them, but if the write
        // hasn't landed yet they'd just re-fetch the OLD value and render
        // the same (wrong) language again — this was the actual bug: the
        // toggle itself worked fine, but nothing ever told those Server
        // Components to re-render at all.
        await supabase.from('profiles').update({ preferred_language: next }).eq('id', user.id);

        // Re-fetches Server Component output for the current route against
        // the now-updated DB value. This does NOT reset this provider's
        // client state or remount anything client-side — router.refresh()
        // is specifically designed to refresh server-rendered content
        // without disturbing Client Component state, which is exactly why
        // the language selection made above isn't clobbered by it.
        router.refresh();
      })();
    },
    [router]
  );

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
