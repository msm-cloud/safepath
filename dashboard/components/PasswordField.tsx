'use client';

import { useId, useState } from 'react';

import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import { useLanguage } from '@/lib/language-context';

// Small, self-contained show/hide toggle for password fields — local
// component state only. The <input> itself stays a plain, uncontrolled
// form field (same name/required/autoComplete it always had), so this
// never touches the signInAction/signUpAction Server Actions or any auth
// logic — only the input's `type` attribute. Reused by both
// app/login/page.tsx and app/signup/page.tsx.
export default function PasswordField({
  name,
  placeholder,
  autoComplete,
}: {
  name: string;
  placeholder: string;
  autoComplete: string;
}) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-md border border-zinc-300 px-3 py-2 pr-10 text-sm outline-none focus:border-blue-500"
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? t('hidePasswordLabel') : t('showPasswordLabel')}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 hover:text-zinc-700"
      >
        {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  );
}
