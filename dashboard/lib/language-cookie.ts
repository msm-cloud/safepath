import type { Language } from './translations';

// Remembers the language for signed-out pages, and is the fallback when a
// signed-in guardian's profile can't be read. The profile wins whenever it
// can be read; LanguageProvider keeps this cookie in step with what's shown.
export const LANGUAGE_COOKIE = 'sp-language';
export const LANGUAGE_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;
export const DEFAULT_LANGUAGE: Language = 'bn';

export function parseLanguage(value: string | undefined): Language | null {
  return value === 'bn' || value === 'en' ? value : null;
}
