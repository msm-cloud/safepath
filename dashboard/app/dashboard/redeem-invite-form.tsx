'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { useLanguage } from '@/lib/language-context';
import { createClient } from '@/lib/supabase/client';
import type { TranslationKey } from '@/lib/translations';
import { buttonClasses } from '@/components/ui/Button';
import { inputClasses } from '@/components/ui/Input';

// redeem_guardian_invite returns jsonb, which the Supabase type generator
// can't know the shape of — this is the shape it actually returns, per
// supabase/migrations/20261002060000_unique_accepted_guardian_link.sql.
type RedeemResult =
  | { success: true; user_id: string; user_name: string | null }
  | { success: false; error: 'invalid_or_used_code' | 'already_linked' | 'not_authenticated' };

const ERROR_KEYS: Record<string, TranslationKey> = {
  invalid_or_used_code: 'invalidOrUsedCode',
  already_linked: 'alreadyLinkedCode',
  // Shouldn't happen — this page is auth-gated by dashboard/layout.tsx —
  // but handle it rather than showing a raw/confusing message if it does.
  not_authenticated: 'sessionExpired',
};

export default function RedeemInviteForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setConfirmation(null);

    // The mobile app shows codes in two groups ("ABCD EFGH").
    const trimmed = code.replace(/[\s-]/g, '');
    if (trimmed.length === 0) {
      setError(t('enterInviteCode'));
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('redeem_guardian_invite', {
      p_invite_code: trimmed,
    });
    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const result = data as unknown as RedeemResult;

    if (!result.success) {
      const key = ERROR_KEYS[result.error];
      setError(key ? t(key) : result.error);
      return;
    }

    setCode('');
    setConfirmation(t('nowLinkedTo', { name: result.user_name ?? t('thisUserFallback') }));
    router.refresh(); // re-fetches the linked-users list rendered below
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 p-4 sm:max-w-md rounded-lg border-[1.5px] border-border bg-surface shadow-sm"
    >
      <label htmlFor="invite-code" className="type-label text-text">
        {t('linkToSomeoneLabel')}
      </label>
      <input
        id="invite-code"
        type="text"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder={t('inviteCodePlaceholder')}
        className={`${inputClasses()} uppercase tracking-widest`}
      />

      {error && <p className="type-body-sm text-danger-text">{error}</p>}
      {confirmation && <p className="type-body-sm text-on-success-soft">{confirmation}</p>}

      <button
        type="submit"
        disabled={submitting}
        className={buttonClasses({ fullWidth: true, loading: submitting })}
      >
        {submitting ? t('linkingButton') : t('linkButton')}
      </button>
    </form>
  );
}
