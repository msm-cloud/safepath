'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import PasswordField from '@/components/PasswordField';
import { signUpAction, type AuthActionState } from '@/lib/auth-actions';
import { useLanguage } from '@/lib/language-context';

const initialState: AuthActionState = { error: null, info: null };

export default function SignUpPage() {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t('signUpTitle')}</h1>

      <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="text"
          name="fullName"
          placeholder={t('fullNamePlaceholder')}
          autoComplete="name"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <input
          type="email"
          name="email"
          placeholder={t('emailPlaceholder')}
          autoComplete="email"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <PasswordField
          name="password"
          placeholder={t('passwordSignupPlaceholder')}
          autoComplete="new-password"
        />

        {/* state.error/info come from the signUpAction Server Action
            (business logic, out of scope for this UI-text-only pass) —
            Supabase's own auth error messages are always English
            regardless. */}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.info && <p className="text-sm text-green-700">{state.info}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? t('creatingAccountButton') : t('signUpButton')}
        </button>
      </form>

      <p className="text-sm text-zinc-500">
        {t('hasAccountQuestion')}{' '}
        <Link href="/login" className="font-medium text-blue-600 underline">
          {t('signInNow')}
        </Link>
      </p>
    </main>
  );
}
