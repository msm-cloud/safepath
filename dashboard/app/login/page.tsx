'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import PasswordField from '@/components/PasswordField';
import { signInAction, type AuthActionState } from '@/lib/auth-actions';
import { useLanguage } from '@/lib/language-context';
import {
  inlineLink,
  publicCard,
  publicError,
  publicFootnote,
  publicForm,
  publicLink,
  publicPrompt,
  publicTitle,
  publicToolbar,
} from '@/components/public-page-styles';
import LanguageToggle from '@/components/LanguageToggle';
import { buttonClasses } from '@/components/ui/Button';
import { inputClasses } from '@/components/ui/Input';

const initialState: AuthActionState = { error: null, info: null };

// Publicly hosted in Supabase Storage (manuals bucket) — opened in a new
// tab via a plain anchor tag.
const USER_MANUAL_URL =
  'https://njeqiynkyjftlfhodqce.supabase.co/storage/v1/object/public/manuals/SafePath_User_Manual.pdf';

export default function LoginPage() {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <main className={publicCard}>
      <div className={publicToolbar}>
        <LanguageToggle />
      </div>
      <h1 className={publicTitle}>{t('signInTitle')}</h1>

      <form action={formAction} className={publicForm}>
        <input
          type="text"
          name="email"
          placeholder={t('emailOrPhonePlaceholder')}
          autoComplete="username"
          required
          className={inputClasses()}
        />
        <PasswordField
          name="password"
          placeholder={t('passwordPlaceholder')}
          autoComplete="current-password"
        />

        <Link href="/forgot-password" className={`self-end ${publicLink}`}>
          {t('forgotPasswordLink')}
        </Link>

        {/* state.error comes from the signInAction Server Action (business
            logic, out of scope for this UI-text-only pass) — Supabase's
            own auth error messages are always English regardless. */}
        {state.error && <p className={publicError}>{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className={buttonClasses({ fullWidth: true, loading: pending })}
        >
          {pending ? t('signingInButton') : t('signInButton')}
        </button>
      </form>

      <p className={publicPrompt}>
        {t('noAccountQuestion')}{' '}
        <Link href="/signup" className={`font-bold ${inlineLink}`}>
          {t('signUpNow')}
        </Link>
      </p>

      <p className={publicFootnote}>
        {t('agreeToTermsPrefix')}{' '}
        <Link href="/terms" className={inlineLink}>
          {t('termsOfServiceLink')}
        </Link>{' '}
        {t('agreeToTermsAnd')}{' '}
        <Link href="/privacy" className={inlineLink}>
          {t('privacyPolicyLink')}
        </Link>
        .
      </p>

      <a
        href={USER_MANUAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`self-center text-center ${publicLink}`}
      >
        {t('userManualLink')}
      </a>
    </main>
  );
}
