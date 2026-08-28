'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import PasswordField from '@/components/PasswordField';
import { useLanguage } from '@/lib/language-context';
import { createClient } from '@/lib/supabase/client';

const MIN_PASSWORD_LENGTH = 6;

// How long to wait for Supabase's own URL-based session detection to fire
// a PASSWORD_RECOVERY event before concluding the link was invalid/
// expired rather than just still loading.
const VERIFY_TIMEOUT_MS = 5000;

type Status = 'verifying' | 'ready' | 'invalid';

// Public route — no auth required in the usual sense: this page is
// reached by clicking the emailed reset link, not by being signed in
// already. createBrowserClient defaults detectSessionInUrl to true, so
// simply creating the client and subscribing to onAuthStateChange
// (both done synchronously, before any await, in the same effect below)
// is enough to catch the PASSWORD_RECOVERY event once Supabase's own
// async token exchange completes — the standard documented pattern for
// this flow, not something built by hand.
export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready');
      }
    });

    const timeout = setTimeout(() => {
      setStatus((current) => (current === 'verifying' ? 'invalid' : current));
    }, VERIFY_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // PasswordField's <input> is uncontrolled (see its own comment) —
    // read it straight off the form, same as the Server Action forms
    // read it via formData.get('password') elsewhere in this app.
    const password = String(new FormData(event.currentTarget).get('password') ?? '');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    // Deliberately sign out rather than leaving the recovery session
    // active — routes back to a real sign-in with the new password
    // instead of silently landing signed in.
    await supabase.auth.signOut();
    setSubmitting(false);
    router.replace('/login');
  };

  if (status === 'verifying') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16">
        <p className="text-sm text-zinc-500">{t('resetLinkVerifying')}</p>
      </main>
    );
  }

  if (status === 'invalid') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16">
        <p className="max-w-sm text-center text-sm text-red-600">
          {t('invalidOrExpiredResetLink')}
        </p>
        <Link href="/forgot-password" className="text-sm font-medium text-blue-600 underline">
          {t('requestNewResetLinkLink')}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t('resetPasswordTitle')}</h1>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <PasswordField
          name="password"
          placeholder={t('newPasswordPlaceholder')}
          autoComplete="new-password"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? t('resettingPasswordButton') : t('resetPasswordButton')}
        </button>
      </form>
    </main>
  );
}
