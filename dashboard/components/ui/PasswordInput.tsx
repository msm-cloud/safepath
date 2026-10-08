'use client';

import { useState } from 'react';

import { useLanguage } from '@/lib/language-context';

import { EyeIcon, EyeOffIcon } from './icons';
import Input, { type InputProps } from './Input';

// Input with a show/hide toggle. Only the input's `type` changes, so it
// still works as a plain uncontrolled field inside a Server Action form.
export default function PasswordInput(props: Omit<InputProps, 'type' | 'trailing'>) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? t('hidePasswordLabel') : t('showPasswordLabel')}
          className="flex size-11 items-center justify-center rounded-sm text-text-muted hover:text-text"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}
