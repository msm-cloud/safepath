import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant =
  | 'ink'
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'dangerOutline'
  | 'emergencyCall'
  | 'onDangerOutline';

export type ButtonSize = 'default' | 'small';

// The main call to action is dark ink, not the brand indigo (same as
// mobile). The last two variants only sit on a danger fill, such as the
// active SOS banner.
const VARIANTS: Record<ButtonVariant, string> = {
  ink: 'bg-ink text-on-ink border-transparent hover:bg-ink-pressed',
  primary: 'bg-primary text-on-primary border-transparent hover:bg-primary-pressed',
  secondary: 'bg-surface text-text border-border-input hover:bg-surface-muted',
  ghost: 'bg-transparent text-primary border-transparent hover:bg-surface-muted',
  danger: 'bg-danger text-on-danger border-transparent hover:bg-danger-pressed',
  dangerOutline: 'bg-surface text-danger-text border-danger-border hover:bg-danger-soft',
  emergencyCall:
    'bg-on-danger text-on-emergency-call border-transparent hover:bg-emergency-call-pressed',
  onDangerOutline: 'bg-transparent text-on-danger border-on-danger-border hover:bg-danger-pressed',
};

const SIZES: Record<ButtonSize, string> = {
  default: 'min-h-[58px] rounded-lg px-gutter type-button',
  small: 'min-h-11 rounded-md px-4 type-label',
};

export type ButtonClassOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  // For a plain <button> disabled while its action runs: keeps the
  // variant's colours instead of the grey disabled look.
  loading?: boolean;
};

// Shared with links that should look like buttons (e.g. "View on map").
export function buttonClasses({
  variant = 'ink',
  size = 'default',
  fullWidth = false,
  loading = false,
}: ButtonClassOptions = {}): string {
  return [
    'inline-flex items-center justify-center gap-2 border-[1.5px] text-center no-underline transition-colors',
    // Grey disabled look, except while loading (aria-busy): the action is in
    // progress rather than unavailable, so it keeps its colours.
    loading
      ? 'disabled:cursor-wait'
      : 'disabled:not-aria-busy:bg-track disabled:not-aria-busy:text-text-disabled disabled:not-aria-busy:border-transparent disabled:cursor-not-allowed',
    fullWidth ? 'w-full' : 'w-fit',
    SIZES[size],
    VARIANTS[variant],
  ].join(' ');
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonClassOptions & {
    loading?: boolean;
    // Shown next to the spinner, e.g. "Linking…". Without it the label stays.
    loadingTitle?: string;
  };

export default function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  loadingTitle,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClasses({ variant, size, fullWidth, loading })} ${className ?? ''}`}
      {...rest}
    >
      {loading && <Spinner />}
      {loading && loadingTitle ? loadingTitle : children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
