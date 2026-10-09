'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';

import { LANGUAGE_COOKIE, LANGUAGE_COOKIE_MAX_AGE_S } from '@/lib/language-cookie';
import { createClient } from '@/lib/supabase/client';
import { t as translate, type Language, type TranslationKey } from '@/lib/translations';

type SetLanguageOptions = {
  // Also write profiles.preferred_language. Only the dashboard's own toggle
  // does this; on signed-out pages the cookie is the only store.
  saveToProfile?: boolean;
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language, options?: SetLanguageOptions) => void;
  followServerLanguage: (language: Language) => void;
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

  // The root layout renders <html lang> from initialLanguage; this keeps it
  // right after the toggle switches language without a full reload. The
  // cookie follows too, so it's the right fallback if the profile can't be
  // read later.
  useEffect(() => {
    document.documentElement.lang = language;
    document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE_S}; samesite=lax`;
  }, [language]);

  const setLanguage = useCallback(
    (next: Language, { saveToProfile = false }: SetLanguageOptions = {}) => {
      // Updates every Client Component reading from this Context
      // immediately (the toggle's own highlight, DashboardHeader's "Sign
      // out", etc.).
      setLanguageState(next);
      if (!saveToProfile) return;

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
    <LanguageContext.Provider
      value={{ language, setLanguage, followServerLanguage: setLanguageState, t }}
    >
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

// Rendered by the dashboard layout with the profile's language. The root
// layout (and this provider) stays mounted across sign-in, so without this
// the client side would keep the signed-out page's language until a full
// reload. Runs again whenever a refresh brings a different language.
export function ServerLanguageSync({ language }: { language: Language }) {
  const { followServerLanguage } = useLanguage();
  useLayoutEffect(() => {
    followServerLanguage(language);
  }, [language, followServerLanguage]);
  return null;
}
