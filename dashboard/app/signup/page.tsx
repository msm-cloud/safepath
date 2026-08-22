'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { signUpAction, type AuthActionState } from '@/lib/auth-actions';

const initialState: AuthActionState = { error: null, info: null };

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold tracking-tight">Create your guardian account</h1>

      <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="text"
          name="fullName"
          placeholder="Full name"
          autoComplete="name"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          autoComplete="email"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <input
          type="password"
          name="password"
          placeholder="Password (min 6 characters)"
          autoComplete="new-password"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.info && <p className="text-sm text-green-700">{state.info}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>

      <p className="text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-600 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
