import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'sos';

// Small status pill ("Live", "Resolved", "SOS"). Pair it with text that
// says the same thing; the colour is a second cue, not the only one.
const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-track text-text-secondary',
  primary: 'bg-primary-soft text-on-primary-soft',
  success: 'bg-success-soft text-on-success-soft',
  warning: 'bg-warning-soft text-on-warning-soft',
  danger: 'bg-danger-soft text-on-danger-soft',
  info: 'bg-info-soft text-on-info-soft',
  // Solid red, for the active SOS state only.
  sos: 'bg-danger text-on-danger',
};

export default function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-pill px-2.5 py-1 type-micro ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
