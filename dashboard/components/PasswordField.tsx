'use client';

import { useId, useState } from 'react';

import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import { useLanguage } from '@/lib/language-context';
import { inputClasses } from '@/components/ui/Input';

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
        className={inputClasses({ trailing: true })}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? t('hidePasswordLabel') : t('showPasswordLabel')}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-text-muted hover:text-text"
      >
        {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  );
}
