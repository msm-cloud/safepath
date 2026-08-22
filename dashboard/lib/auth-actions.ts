'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

// Deliberately simple — good enough to catch obvious typos before hitting
// the network. Supabase itself is the real source of truth on what counts
// as a valid, deliverable email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export type AuthActionState = {
  error: string | null;
  info: string | null;
};

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.', info: null };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, info: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Surface Supabase's own message (e.g. "Invalid login credentials")
    // rather than a generic one.
    return { error: error.message, info: null };
  }

  redirect('/dashboard');
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (fullName.length === 0) {
    return { error: 'Enter your name.', info: null };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.', info: null };
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
      preferred_language: 'bn',
    })
    .eq('id', data.session.user.id);

  if (profileError) {
    return { error: profileError.message, info: null };
  }

  redirect('/dashboard');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
