import type { Metadata } from 'next';
import { Figtree, Hind_Siliguri, Sora } from 'next/font/google';
import type { ReactNode } from 'react';

import { LanguageProvider } from '@/lib/language-context';
import type { Language } from '@/lib/translations';
import { createPageClient, getAuthState } from '@/lib/supabase/auth-state';

import './globals.css';

// Same faces as the mobile app: Sora for headings, Figtree for body text,
// Hind Siliguri for Bangla. next/font serves them from this app, so pages
// make no request to Google at runtime.
const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  weight: ['600', '700'],
});

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const hindSiliguri = Hind_Siliguri({
  variable: '--font-hind-siliguri',
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'SafePath Dashboard',
  description: 'Guardian dashboard for the SafePath safety alert app.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Read the signed-in user's saved language server-side, once, here at
  // the root — so LanguageProvider (a Client Component, since Server
  // Components can't use Context) starts with the right language
  // immediately instead of flashing the 'bn' default first. Pre-auth
  // pages (login/signup) have no user yet, so they fall back to 'bn',
  // matching the profiles.preferred_language column default.
  const auth = await getAuthState();
  const user = auth.status === 'signed-out' ? null : auth.user;

  let initialLanguage: Language = 'bn';
  if (user) {
    const supabase = await createPageClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .single();
    if (profile?.preferred_language) {
      initialLanguage = profile.preferred_language;
    }
  }

  return (
    // lang drives the Bangla line-height rules in theme.css and screen reader
    // pronunciation; LanguageProvider keeps it in step when the toggle changes.
    <html
      lang={initialLanguage}
      className={`${sora.variable} ${figtree.variable} ${hindSiliguri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider initialLanguage={initialLanguage}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
