'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import PasswordField from '@/components/PasswordField';
import { signInAction, type AuthActionState } from '@/lib/auth-actions';
import { useLanguage } from '@/lib/language-context';

const initialState: AuthActionState = { error: null, info: null };

// Publicly hosted in Supabase Storage (manuals bucket) — opened in a new
// tab via a plain anchor tag.
const USER_MANUAL_URL =
  'https://njeqiynkyjftlfhodqce.supabase.co/storage/v1/object/public/manuals/SafePath_User_Manual.pdf';

export default function LoginPage() {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t('signInTitle')}</h1>

      <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="text"
          name="email"
          placeholder={t('emailOrPhonePlaceholder')}
          autoComplete="username"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <PasswordField
          name="password"
          placeholder={t('passwordPlaceholder')}
          autoComplete="current-password"
        />

        <Link href="/forgot-password" className="text-right text-sm text-blue-600 underline">
          {t('forgotPasswordLink')}
        </Link>

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

      <p className="max-w-sm text-center text-xs text-zinc-400">
        {t('agreeToTermsPrefix')}{' '}
        <Link href="/terms" className="underline">
          {t('termsOfServiceLink')}
        </Link>{' '}
        {t('agreeToTermsAnd')}{' '}
        <Link href="/privacy" className="underline">
          {t('privacyPolicyLink')}
        </Link>
        .
      </p>

      <a
        href={USER_MANUAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-zinc-400 underline"
      >
        {t('userManualLink')}
      </a>
    </main>
  );
}
