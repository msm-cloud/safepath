'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { useLanguage } from '@/lib/language-context';
import { createClient } from '@/lib/supabase/client';
import type { TranslationKey } from '@/lib/translations';

// redeem_guardian_invite returns jsonb, which the Supabase type generator
// can't know the shape of — this is the shape it actually returns, per
// supabase/migrations/20260821192936_fix_guardian_links_invite_leak.sql.
type RedeemResult =
  | { success: true; user_id: string; user_name: string | null }
  | { success: false; error: 'invalid_or_used_code' | 'not_authenticated' };

const ERROR_KEYS: Record<string, TranslationKey> = {
  invalid_or_used_code: 'invalidOrUsedCode',
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

    const trimmed = code.trim();
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
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <label htmlFor="invite-code" className="text-sm font-medium">
        {t('linkToSomeoneLabel')}
      </label>
      <input
        id="invite-code"
        type="text"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder={t('inviteCodePlaceholder')}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase tracking-widest outline-none focus:border-blue-500"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {confirmation && <p className="text-sm text-green-700">{confirmation}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? t('linkingButton') : t('linkButton')}
      </button>
    </form>
  );
}
