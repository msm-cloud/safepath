'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { forgotPasswordAction, type ForgotPasswordState } from '@/lib/auth-actions';
import { useLanguage } from '@/lib/language-context';

const initialState: ForgotPasswordState = { status: 'idle' };

// Public route — no auth required, same as /login and /signup.
export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t('forgotPasswordTitle')}</h1>
      <p className="max-w-sm text-center text-sm text-zinc-500">{t('forgotPasswordSubtitle')}</p>

      {state.status === 'sent' ? (
        <p className="max-w-sm text-center text-sm text-green-700">{t('resetLinkSentMessage')}</p>
      ) : (
        <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
          <input
            type="text"
            name="identifier"
            placeholder={t('emailOrPhonePlaceholder')}
            autoComplete="username"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          {state.status === 'invalid' && (
            <p className="text-sm text-red-600">{t('invalidEmailOrPhone')}</p>
          )}
          {state.status === 'rate_limited' && (
            <p className="text-sm text-red-600">{t('tooManyAttemptsMessage')}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? t('sendingResetLinkButton') : t('sendResetLinkButton')}
          </button>
        </form>
      )}

      <Link href="/login" className="text-sm font-medium text-blue-600 underline">
        {t('backToSignInLink')}
      </Link>
    </main>
  );
}
