import type { HTMLAttributes } from 'react';

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article' | 'li';
  variant?: 'plain' | 'muted';
  // 'none' lets full-width rows draw their own padding and dividers.
  padding?: 'none' | 'md' | 'lg' | 'xl';
};

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'overflow-hidden',
  md: 'p-3',
  lg: 'p-4',
  xl: 'p-gutter',
};

export default function Card({
  as: Element = 'div',
  variant = 'plain',
  padding = 'lg',
  className,
  ...rest
}: CardProps) {
  return (
    <Element
      className={[
        'rounded-lg border-[1.5px] border-border',
        variant === 'muted' ? 'bg-surface-muted' : 'bg-surface shadow-sm',
        PADDING[padding],
        className ?? '',
      ].join(' ')}
      {...rest}
    />
  );
}
