import { cookies } from 'next/headers';

import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, parseLanguage } from './language-cookie';
import type { Language } from './translations';

// Language to use when there's no readable profile: the visitor's last
// choice, or Bangla.
export async function cookieLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  return parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) ?? DEFAULT_LANGUAGE;
}
