'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { signInAction, type AuthActionState } from '@/lib/auth-actions';
import { useLanguage } from '@/lib/language-context';

const initialState: AuthActionState = { error: null, info: null };

export default function LoginPage() {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t('signInTitle')}</h1>

      <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="email"
          name="email"
          placeholder={t('emailPlaceholder')}
          autoComplete="email"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <input
          type="password"
          name="password"
          placeholder={t('passwordPlaceholder')}
          autoComplete="current-password"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />

        {/* state.error comes from the signInAction Server Action (business
            logic, out of scope for this UI-text-only pass) — Supabase's
            own auth error messages are always English regardless. */}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? t('signingInButton') : t('signInButton')}
        </button>
      </form>

      <p className="text-sm text-zinc-500">
        {t('noAccountQuestion')}{' '}
        <Link href="/signup" className="font-medium text-blue-600 underline">
          {t('signUpNow')}
        </Link>
      </p>
    </main>
  );
}
