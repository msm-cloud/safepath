'use server';

import { redirect } from 'next/navigation';

import { isValidPhone } from '@/lib/validation';
import { createClient } from '@/lib/supabase/server';

// Deliberately simple — good enough to catch obvious typos before hitting
// the network. Supabase itself is the real source of truth on what counts
// as a valid, deliverable email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

// profiles.phone's unique index violation — see
// supabase/migrations/20260828063528_phone_login_and_password_reset.sql.
const PHONE_UNIQUE_VIOLATION = '23505';

// This exact string, verbatim — not passed through from Supabase's own
// error — for BOTH an unresolved email/phone identifier AND a wrong
// password against a real one (Supabase's own error.code for the latter
// is 'invalid_credentials'). Keeping this as one shared constant, used in
// both branches below, is what guarantees the two are byte-identical
// rather than just coincidentally the same today — which is what
// actually prevents someone from telling "wrong password" apart from
// "that email/phone has no account" by the error text.
const INVALID_CREDENTIALS_MESSAGE = 'Invalid login credentials';

export type AuthActionState = {
  error: string | null;
  info: string | null;
};

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const identifier = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!EMAIL_RE.test(identifier) && !isValidPhone(identifier)) {
    return { error: 'Enter a valid email address or phone number.', info: null };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, info: null };
  }

  const supabase = await createClient();

  // Turns a phone number into the account's real email first (a no-op,
  // no-lookup pass-through if `identifier` is already an email — see
  // resolve_login_identifier in the migration above) — signInWithPassword
  // itself only understands email.
  const { data: resolvedEmail } = await supabase.rpc('resolve_login_identifier', {
    identifier,
  });
  if (!resolvedEmail) {
    // Deliberately not even attempting signInWithPassword with the raw
    // (unresolved) identifier — Supabase's own email-format validation
    // would reject a phone-shaped string differently than it rejects a
    // wrong password for a real email, which would itself be a giveaway.
    return { error: INVALID_CREDENTIALS_MESSAGE, info: null };
  }

  const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });

  if (error) {
    return {
      error: error.code === 'invalid_credentials' ? INVALID_CREDENTIALS_MESSAGE : error.message,
      info: null,
    };
  }

  redirect('/dashboard');
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (fullName.length === 0) {
    return { error: 'Enter your name.', info: null };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.', info: null };
  }
  if (!isValidPhone(phone)) {
    return { error: 'Enter a valid phone number.', info: null };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, info: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Defensive fallback for when this project requires email
      // confirmation: there's no session yet below to run the profiles
      // UPDATE with, so this is the only way full_name reaches the
      // profiles row (via handle_new_user reading it off signup metadata)
      // before the guardian confirms and signs in for the first time.
      data: { full_name: fullName },
    },
  });

  if (error) {
    // Surface Supabase's own message (e.g. "User already registered")
    // rather than a generic one.
    return { error: error.message, info: null };
  }

  if (!data.session) {
    // Email confirmation is required by this Supabase project — there's no
    // authenticated session yet, so the profiles UPDATE below would be
    // rejected by RLS (profiles_update_own requires auth.uid() = id).
    // full_name was still captured via signup metadata above.
    return { error: null, info: 'Check your email to confirm your account, then sign in.' };
  }

  // Dashboard is always the guardian app — role is always 'guardian' here.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      role: 'guardian',
      full_name: fullName,
      phone,
      preferred_language: 'bn',
    })
    .eq('id', data.session.user.id);

  if (profileError) {
    // profiles_phone_normalized_key (see the phone-login migration)
    // rejects a phone number already used by another account — give a
    // specific, actionable message instead of Supabase's raw
    // constraint-violation text.
    return {
      error:
        profileError.code === PHONE_UNIQUE_VIOLATION
          ? 'That phone number is already registered to another account.'
          : profileError.message,
      info: null,
    };
  }

  redirect('/dashboard');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
