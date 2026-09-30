'use server';

import { redirect } from 'next/navigation';

import { phoneReset, phoneSignIn } from '@/lib/auth-identifier';
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
// Matches GoTrue's own message, which the email path passes through.
const EMAIL_NOT_CONFIRMED_MESSAGE = 'Email not confirmed';
const TOO_MANY_ATTEMPTS_MESSAGE = 'Too many attempts, try later.';
const SIGN_IN_UNAVAILABLE_MESSAGE = 'Sign-in is temporarily unavailable. Try again later.';

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

  if (EMAIL_RE.test(identifier)) {
    const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
    if (error) {
      return {
        error: error.code === 'invalid_credentials' ? INVALID_CREDENTIALS_MESSAGE : error.message,
        info: null,
      };
    }
    redirect('/dashboard');
  }

  // Phone sign-in goes through the edge function so the email behind the
  // number never reaches this server or the browser.
  const result = await phoneSignIn(identifier, password);
  switch (result.kind) {
    case 'ok': {
      const { error } = await supabase.auth.setSession(result.session);
      if (error) return { error: SIGN_IN_UNAVAILABLE_MESSAGE, info: null };
      redirect('/dashboard');
    }
    case 'invalid_credentials':
      return { error: INVALID_CREDENTIALS_MESSAGE, info: null };
    case 'email_not_confirmed':
      return { error: EMAIL_NOT_CONFIRMED_MESSAGE, info: null };
    case 'rate_limited':
      return { error: TOO_MANY_ATTEMPTS_MESSAGE, info: null };
    case 'error':
      return { error: SIGN_IN_UNAVAILABLE_MESSAGE, info: null };
  }
}

export type ForgotPasswordState = {
  status: 'idle' | 'invalid' | 'rate_limited' | 'sent';
};

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const identifier = String(formData.get('identifier') ?? '').trim();
  const isEmail = EMAIL_RE.test(identifier);
  if (!isEmail && !isValidPhone(identifier)) {
    return { status: 'invalid' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const redirectTo = `${siteUrl}/reset-password`;

  // The outcome is 'sent' whether or not an account exists, and failures
  // are not surfaced, so this can't be used to find registered emails or
  // phones. The phone rate limit counts unknown numbers too, so reporting
  // it reveals nothing either.
  if (isEmail) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(identifier, { redirectTo });
    return { status: 'sent' };
  }

  const result = await phoneReset(identifier, redirectTo);
  return { status: result.kind === 'rate_limited' ? 'rate_limited' : 'sent' };
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

  // No phone-availability check here: an anonymous "is this number taken?"
  // answer would let anyone enumerate registered phones. If the number is
  // already in use, handle_new_user() creates the account without it, and
  // the dashboard layout tells the guardian after their first sign-in.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Defensive fallback for when this project requires email
      // confirmation (which it now always does): there's no session yet
      // below to run the profiles UPDATE with, so this is the only way
      // full_name/phone/role/preferred_language reach the profiles row
      // (via handle_new_user reading them off signup metadata — see
      // 20260828091441_phone_survives_email_confirmation.sql) before the
      // guardian confirms and signs in for the first time.
      //
      // role was a real, confirmed bug here (found auditing a report of
      // a guardian account stuck as role='user'): this object used to
      // omit role entirely, so handle_new_user()'s
      // `coalesce(raw_user_meta_data->>'role', 'user')` silently
      // defaulted every dashboard signup to 'user' — and since the
      // post-signup UPDATE below never runs without a session, nothing
      // ever corrected it. preferred_language is included too even
      // though its trigger default ('bn') already matches what this
      // dashboard's own post-signup UPDATE sets — no behavior change
      // today, just closing the same class of gap before a future
      // default change could reopen it.
      data: { full_name: fullName, phone, role: 'guardian', preferred_language: 'bn' },
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
    // full_name/phone were both still captured via signup metadata above.
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
