'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { forgotPasswordAction, type ForgotPasswordState } from '@/lib/auth-actions';
import { useLanguage } from '@/lib/language-context';
import {
  publicCard,
  publicError,
  publicForm,
  publicLink,
  publicSubtitle,
  publicSuccess,
  publicTitle,
} from '@/components/public-page-styles';
import { buttonClasses } from '@/components/ui/Button';
import { inputClasses } from '@/components/ui/Input';

const initialState: ForgotPasswordState = { status: 'idle' };

// Public route — no auth required, same as /login and /signup.
export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  return (
    <main className={publicCard}>
      <h1 className={publicTitle}>{t('forgotPasswordTitle')}</h1>
      <p className={publicSubtitle}>{t('forgotPasswordSubtitle')}</p>

      {state.status === 'sent' ? (
        <p className={publicSuccess}>{t('resetLinkSentMessage')}</p>
      ) : (
        <form action={formAction} className={publicForm}>
          <input
            type="text"
            name="identifier"
            placeholder={t('emailOrPhonePlaceholder')}
            autoComplete="username"
            required
            className={inputClasses()}
          />

          {state.status === 'invalid' && <p className={publicError}>{t('invalidEmailOrPhone')}</p>}
          {state.status === 'rate_limited' && (
            <p className={publicError}>{t('tooManyAttemptsMessage')}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className={buttonClasses({ fullWidth: true, loading: pending })}
          >
            {pending ? t('sendingResetLinkButton') : t('sendResetLinkButton')}
          </button>
        </form>
      )}

      <Link href="/login" className={`self-center ${publicLink}`}>
        {t('backToSignInLink')}
      </Link>
    </main>
  );
}
