'use client';

import { type InputHTMLAttributes, type ReactNode, useId } from 'react';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  helper?: string;
  error?: string;
  // Rendered inside the field on the right, e.g. the password visibility
  // toggle. The field reserves room for it so text never runs underneath.
  trailing?: ReactNode;
  // For callers that already own an id (e.g. an existing <label htmlFor>).
  id?: string;
};

// Shared with plain <input> elements that have no visible label of their
// own (the sign-in and sign-up forms use placeholders only).
export function inputClasses({
  error = false,
  trailing = false,
}: { error?: boolean; trailing?: boolean } = {}): string {
  return [
    'type-body min-h-[54px] w-full rounded-md border-[1.5px] bg-surface px-4 text-text',
    'placeholder:text-text-muted outline-none focus:border-focus',
    'disabled:bg-surface-muted disabled:text-text-muted',
    error ? 'border-danger-text' : 'border-border-input',
    trailing ? 'pr-[52px]' : '',
  ].join(' ');
}

export default function Input({
  label,
  helper,
  error,
  trailing,
  id,
  className,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const noteId = `${inputId}-note`;
  const note = error ?? helper;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="type-label text-text">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={`${inputClasses({ error: !!error, trailing: !!trailing })} ${className ?? ''}`}
          {...rest}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex w-12 items-center justify-center">
            {trailing}
          </div>
        )}
      </div>
      {note && (
        <p
          id={noteId}
          aria-live={error ? 'polite' : undefined}
          className={`type-caption ${error ? 'text-danger-text' : 'text-text-muted'}`}
        >
          {note}
        </p>
      )}
    </div>
  );
}
