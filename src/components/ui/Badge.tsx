'use client';

import type { HTMLAttributes } from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline'
  | 'neutral'
  | 'muted';

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-800',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-indigo-100 text-indigo-700',
  outline: 'border border-slate-200 bg-white text-slate-800',
  neutral: 'bg-slate-100 text-slate-800',
  muted: 'border border-slate-200 bg-white text-slate-600'
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantKey: BadgeVariant = variant ?? 'default';
  const classes = [
    'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
    badgeVariants[variantKey],
    className
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={classes} {...props} />;
}
