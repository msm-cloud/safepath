'use client';

import { type FormEvent, useEffect, useState } from 'react';

import { useLanguage } from '@/lib/language-context';
import { createClient } from '@/lib/supabase/client';
import { isValidPhone } from '@/lib/validation';

// profiles.phone's unique index violation — see
// supabase/migrations/20260828063528_phone_login_and_password_reset.sql.
const PHONE_UNIQUE_VIOLATION = '23505';

// Gated by dashboard/app/dashboard/layout.tsx like every other /dashboard
// route — no separate auth check needed here.
//
// Built specifically to give an account created before
// 20260828091441_phone_survives_email_confirmation.sql (or one whose
// phone lost a narrow signup-time race — see that migration's own
// comment) a real way to add/fix their phone number, since this app has
// no other account/profile page at all. Mirrors mobile's
// SettingsScreen.tsx phone field: its own local state, not the
// optimistic fire-and-forget pattern nothing else on this page needs,
// because a duplicate phone number is a real, user-facing failure that
// has to be shown, not silently dropped.
export default function DashboardSettingsPage() {
  const { t } = useLanguage();
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single();
      if (cancelled) return;

      setUserId(user.id);
      setFullName(data?.full_name ?? '');
      setPhone(data?.phone ?? '');
      setSavedPhone(data?.phone ?? '');
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNameError(null);
    setNameSaved(false);

    const trimmed = fullName.trim();
    if (trimmed.length === 0 || !userId) {
      setNameError('Enter your name.');
      return;
    }

    setSavingName(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', userId);
    setSavingName(false);

    if (error) {
      setNameError(error.message);
      return;
    }

    setFullName(trimmed);
    setNameSaved(true);
  };

  const handleSavePhone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPhoneError(null);
    setPhoneSaved(false);

    const trimmed = phone.trim();
    if (!isValidPhone(trimmed) || !userId) {
      setPhoneError(t('invalidPhone'));
      return;
    }

    setSavingPhone(true);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ phone: trimmed }).eq('id', userId);
    setSavingPhone(false);

    if (error) {
      // profiles_phone_normalized_key — same duplicate-phone check as
      // sign-up, surfaced the same way.
      setPhoneError(
        error.code === PHONE_UNIQUE_VIOLATION ? t('duplicatePhoneError') : error.message
      );
      return;
    }

    setPhone(trimmed);
    setSavedPhone(trimmed);
    setPhoneSaved(true);
  };

  if (!loaded) {
    return <main className="flex flex-1 flex-col gap-6 p-16" />;
  }

  return (
    <main className="flex flex-1 flex-col gap-10 p-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t('settingsTitle')}</h1>

      <form onSubmit={handleSaveName} className="flex w-full max-w-sm flex-col gap-3">
        <label htmlFor="full-name" className="text-sm font-medium">
          {t('fullNamePlaceholder')}
        </label>
        <input
          id="full-name"
          type="text"
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            setNameSaved(false);
          }}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        {nameError && <p className="text-sm text-red-600">{nameError}</p>}
        {nameSaved && <p className="text-sm text-green-700">{t('nameSavedMessage')}</p>}
        <button
          type="submit"
          disabled={savingName || fullName.trim() === fullName}
          className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {savingName ? t('savingButton') : t('saveButton')}
        </button>
      </form>

      <form onSubmit={handleSavePhone} className="flex w-full max-w-sm flex-col gap-3">
        <label htmlFor="phone" className="text-sm font-medium">
          {t('phonePlaceholder')}
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setPhoneSaved(false);
          }}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
        {phoneSaved && <p className="text-sm text-green-700">{t('phoneSavedMessage')}</p>}
        <button
          type="submit"
          disabled={savingPhone || phone.trim() === savedPhone}
          className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {savingPhone ? t('savingButton') : t('saveButton')}
        </button>
      </form>
    </main>
  );
}
