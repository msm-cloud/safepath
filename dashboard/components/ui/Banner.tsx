import type { ComponentType, ReactNode } from 'react';

import { CheckCircleIcon, ErrorIcon, InfoIcon, SparkleIcon, WarningIcon } from './icons';

export type BannerTone = 'primary' | 'info' | 'success' | 'warning' | 'danger';

export type BannerProps = {
  tone?: BannerTone;
  title?: string;
  children: ReactNode;
  // A link or button rendered under the message, e.g. "Open settings".
  action?: ReactNode;
};

// Each tone has its own icon so the meaning never rests on colour alone.
const TONES: Record<BannerTone, { classes: string; Icon: ComponentType<{ size?: number }> }> = {
  primary: { classes: 'bg-primary-soft text-on-primary-soft', Icon: SparkleIcon },
  info: { classes: 'bg-info-soft text-on-info-soft', Icon: InfoIcon },
  success: { classes: 'bg-success-soft text-on-success-soft', Icon: CheckCircleIcon },
  warning: { classes: 'bg-warning-soft text-on-warning-soft', Icon: WarningIcon },
  danger: { classes: 'bg-danger-soft text-on-danger-soft', Icon: ErrorIcon },
};

export default function Banner({ tone = 'primary', title, children, action }: BannerProps) {
  const { classes, Icon } = TONES[tone];
  // Warnings and errors are announced as soon as they appear.
  const urgent = tone === 'warning' || tone === 'danger';

  return (
    <div role={urgent ? 'alert' : undefined} className={`flex gap-3 rounded-md p-4 ${classes}`}>
      <span className="mt-0.5 shrink-0">
        <Icon size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="type-label">{title}</p>}
        <div className="type-body-sm">{children}</div>
        {action && <div className="mt-1 type-label [&_a]:underline">{action}</div>}
      </div>
    </div>
  );
}
