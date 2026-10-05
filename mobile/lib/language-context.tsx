import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { profileCache } from '@/lib/device-profile-cache';
import { supabase } from '@/lib/supabase';
import { t as translate, type Language, type TranslationKey } from '@/lib/translations';

type LanguageContextValue = {
  language: Language;
  // Switches at once, awaits the write and resolves to whether it
  // persisted; on failure the previous language is restored first.
  setLanguage: (language: Language) => Promise<boolean>;
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
    (async () => {
      // The on-device copy first, so an offline start still shows the
      // person's own language; the server's answer, when it comes, wins.
      const cached = await profileCache.readLanguage(userId);
      if (cancelled) return;
      if (cached) setLanguageState(cached);

      const { data } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', userId)
        .single();
      if (cancelled) return;
      if (data?.preferred_language) {
        setLanguageState(data.preferred_language);
        void profileCache.writeLanguage(userId, data.preferred_language);
      }
      setLoadedForUserId(userId);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user.id, loadedForUserId]);

  const setLanguage = useCallback(
    async (next: Language): Promise<boolean> => {
      const previous = language;
      setLanguageState(next);
      const userId = session?.user.id;
      // Signed out (the auth screens' switch), there is no profile to save to.
      if (!userId) return true;

      // The query builder only sends the request once awaited.
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: next })
        .eq('id', userId);
      if (error) {
        setLanguageState((current) => (current === next ? previous : current));
        return false;
      }
      void profileCache.writeLanguage(userId, next);
      return true;
    },
    [language, session?.user.id]
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
