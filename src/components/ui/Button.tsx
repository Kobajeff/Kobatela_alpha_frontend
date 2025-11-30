'use client';

import type { ButtonHTMLAttributes, DetailedHTMLProps } from 'react';

const variantClasses: Record<Required<ButtonProps>['variant'], string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500 disabled:bg-indigo-300',
  secondary:
    'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500 disabled:bg-slate-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-500 disabled:bg-rose-300',
  outline:
    'border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-400 disabled:text-slate-400 disabled:border-slate-200'
};

const sizeClasses: Record<Required<ButtonProps>['size'], string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base'
};

export type ButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center rounded-md font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 transition-colors',
    variantClasses[variant],
    sizeClasses[size],
    className
  ]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...props} />;
}
