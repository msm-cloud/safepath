import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { t as translate, type Language, type TranslationKey } from '@/lib/translations';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  // 'bn' matches the profiles.preferred_language column default — the
  // right blind default before we've had a chance to read the signed-in
  // user's actual saved preference below.
  const [language, setLanguageState] = useState<Language>('bn');
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || loadedForUserId === userId) return;

    let cancelled = false;
    supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.preferred_language) {
          setLanguageState(data.preferred_language);
        }
        setLoadedForUserId(userId);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user.id, loadedForUserId]);

  const setLanguage = useCallback(
    (next: Language) => {
      // Update immediately — don't wait on the write below to reflect the
      // choice in the UI.
      setLanguageState(next);
      const userId = session?.user.id;
      if (userId) {
        supabase.from('profiles').update({ preferred_language: next }).eq('id', userId);
      }
    },
    [session?.user.id]
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
