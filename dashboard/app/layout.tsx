import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { LanguageProvider } from '@/lib/language-context';
import type { Language } from '@/lib/translations';
import { createClient } from '@/lib/supabase/server';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialLanguage: Language = 'bn';
  if (user) {
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LanguageProvider initialLanguage={initialLanguage}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
