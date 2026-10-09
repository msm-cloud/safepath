'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import PasswordField from '@/components/PasswordField';
import { signUpAction, type AuthActionState } from '@/lib/auth-actions';
import { useLanguage } from '@/lib/language-context';
import {
  inlineLink,
  publicCard,
  publicError,
  publicFootnote,
  publicForm,
  publicLink,
  publicPrompt,
  publicSuccess,
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

export default function SignUpPage() {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <main className={publicCard}>
      <div className={publicToolbar}>
        <LanguageToggle />
      </div>
      <h1 className={publicTitle}>{t('signUpTitle')}</h1>

      <form action={formAction} className={publicForm}>
        <input
          type="text"
          name="fullName"
          placeholder={t('fullNamePlaceholder')}
          autoComplete="name"
          required
          className={inputClasses()}
        />
        <input
          type="email"
          name="email"
          placeholder={t('emailPlaceholder')}
          autoComplete="email"
          required
          className={inputClasses()}
        />
        <input
          type="tel"
          name="phone"
          placeholder={t('phonePlaceholder')}
          autoComplete="tel"
          required
          className={inputClasses()}
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
        {state.error && <p className={publicError}>{state.error}</p>}
        {state.info && <p className={publicSuccess}>{state.info}</p>}

        <button
          type="submit"
          disabled={pending}
          className={buttonClasses({ fullWidth: true, loading: pending })}
        >
          {pending ? t('creatingAccountButton') : t('signUpButton')}
        </button>
      </form>

      <p className={publicPrompt}>
        {t('hasAccountQuestion')}{' '}
        <Link href="/login" className={`font-bold ${inlineLink}`}>
          {t('signInNow')}
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
