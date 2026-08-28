'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { useLanguage } from '@/lib/language-context';
import { createClient } from '@/lib/supabase/client';
import { isValidPhone } from '@/lib/validation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public route — no auth required, same as /login and /signup.
export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = identifier.trim();
    if (!EMAIL_RE.test(trimmed) && !isValidPhone(trimmed)) {
      setError(t('invalidEmailOrPhone'));
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    // Turns a phone number into the account's real email first (a no-op,
    // no-lookup pass-through if `trimmed` is already an email — see the
    // migration this RPC comes from).
    const { data: resolvedEmail } = await supabase.rpc('resolve_login_identifier', {
      identifier: trimmed,
    });

    // Only actually send an email if the identifier resolved to a real
    // account — but show the exact same success state either way below.
    // Calling resetPasswordForEmail with a fabricated address would risk
    // a distinguishable error/timing from Supabase's own side; simply not
    // calling it is the more robust way to guarantee this can't be used
    // to enumerate which emails/phones have accounts.
    if (resolvedEmail) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
      await supabase.auth.resetPasswordForEmail(resolvedEmail, {
        redirectTo: `${siteUrl}/reset-password`,
      });
    }

    setSubmitting(false);
    setSent(true);
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t('forgotPasswordTitle')}</h1>
      <p className="max-w-sm text-center text-sm text-zinc-500">{t('forgotPasswordSubtitle')}</p>

      {sent ? (
        <p className="max-w-sm text-center text-sm text-green-700">{t('resetLinkSentMessage')}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
          <input
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder={t('emailOrPhonePlaceholder')}
            autoComplete="username"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? t('sendingResetLinkButton') : t('sendResetLinkButton')}
          </button>
        </form>
      )}

      <Link href="/login" className="text-sm font-medium text-blue-600 underline">
        {t('backToSignInLink')}
      </Link>
    </main>
  );
}
