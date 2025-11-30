'use client';

import type { HTMLAttributes } from 'react';

const badgeVariants: Record<BadgeProps['variant'], string> = {
  default: 'bg-slate-100 text-slate-800',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-indigo-100 text-indigo-700'
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const classes = [
    'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
    badgeVariants[variant],
    className
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={classes} {...props} />;
}
