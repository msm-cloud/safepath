'use client';

import { type KeyboardEvent, useRef } from 'react';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  // Sets lang on a label in another language (e.g. "বাংলা" in the English UI).
  lang?: string;
};

export type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
  fullWidth?: boolean;
};

// Radio group drawn as a pill track; the selected option is an ink pill.
// Arrow keys move the selection, as with native radio buttons.
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`gap-0.5 rounded-pill bg-track p-1 ${fullWidth ? 'flex w-full' : 'inline-flex'}`}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            lang={option.lang}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={[
              'min-h-10 rounded-pill px-4 type-label transition-colors',
              fullWidth ? 'flex-1' : '',
              selected ? 'bg-ink text-on-ink' : 'text-text hover:bg-surface-muted',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
